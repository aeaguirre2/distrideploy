package ec.edu.espe.websocketserver.service;

import ec.edu.espe.websocketserver.model.Usuario;
import ec.edu.espe.websocketserver.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import java.util.Collections;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuthService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (!usuario.isActivo()) {
            throw new UsernameNotFoundException("Usuario inactivo");
        }

        if (usuario.isBloqueado()) {
            throw new UsernameNotFoundException("Usuario bloqueado");
        }

        return new org.springframework.security.core.userdetails.User(
            usuario.getUsername(),
            usuario.getPassword(),
            Collections.singletonList(new SimpleGrantedAuthority(usuario.getTipoUsuario().name()))
        );
    }

    @Transactional
    public Usuario registrarUsuario(Usuario usuario) {
        // Validar campos requeridos
        if (usuario.getUsername() == null || usuario.getUsername().trim().isEmpty()) {
            throw new RuntimeException("El nombre de usuario es requerido");
        }
        if (usuario.getPassword() == null || usuario.getPassword().trim().isEmpty()) {
            throw new RuntimeException("La contraseña es requerida");
        }
        if (usuario.getEmail() == null || usuario.getEmail().trim().isEmpty()) {
            throw new RuntimeException("El email es requerido");
        }
        if (usuario.getNombre() == null || usuario.getNombre().trim().isEmpty()) {
            throw new RuntimeException("El nombre es requerido");
        }
        if (usuario.getApellido() == null || usuario.getApellido().trim().isEmpty()) {
            throw new RuntimeException("El apellido es requerido");
        }
        if (usuario.getTipoUsuario() == null) {
            throw new RuntimeException("El tipo de usuario es requerido (COMPRADOR o VENDEDOR)");
        }

        // Validar si el usuario ya existe
        if (usuarioRepository.existsByUsername(usuario.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya existe");
        }
        
        // No permitir registro directo de administradores
        if (usuario.getTipoUsuario() == Usuario.TipoUsuario.ADMIN) {
            throw new RuntimeException("No se permite el registro directo de administradores");
        }
        
        // Limpiar espacios en blanco
        usuario.setUsername(usuario.getUsername().trim());
        usuario.setEmail(usuario.getEmail().trim());
        usuario.setNombre(usuario.getNombre().trim());
        usuario.setApellido(usuario.getApellido().trim());
        
        // Encriptar contraseña y establecer valores por defecto
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        usuario.setActivo(true);
        usuario.setBloqueado(false);
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuario.setIntentosFallidos(0);
        
        try {
            return usuarioRepository.save(usuario);
        } catch (Exception e) {
            throw new RuntimeException("Error al guardar el usuario en la base de datos: " + e.getMessage());
        }
    }

    public Usuario autenticarUsuario(String username, String password) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!usuario.isActivo()) {
            throw new RuntimeException("Usuario inactivo");
        }

        if (usuario.isBloqueado()) {
            throw new RuntimeException("Usuario bloqueado temporalmente");
        }

        if (!passwordEncoder.matches(password, usuario.getPassword())) {
            usuario.incrementarIntentosFallidos();
            usuarioRepository.save(usuario);
            throw new RuntimeException("Contraseña incorrecta");
        }

        // Resetear intentos fallidos y actualizar último acceso
        usuario.resetearIntentosFallidos();
        usuario.setUltimoAcceso(LocalDateTime.now());
        return usuarioRepository.save(usuario);
    }
    
    @Transactional
    public void crearUsuarioAdmin() {
        if (!usuarioRepository.existsByUsername("admin")) {
            Usuario admin = new Usuario();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@subastas.com");
            admin.setNombre("Administrador");
            admin.setApellido("Sistema");
            admin.setTipoUsuario(Usuario.TipoUsuario.ADMIN);
            admin.setActivo(true);
            admin.setBloqueado(false);
            admin.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(admin);
        }
    }
    
    @Transactional
    public Usuario desactivarUsuario(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(false);
        usuario.setBloqueado(true);
        return usuarioRepository.save(usuario);
    }
    
    @Transactional
    public Usuario activarUsuario(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(true);
        usuario.setBloqueado(false);
        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario obtenerUsuarioPorUsername(String username) {
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
    
    @Transactional(readOnly = true)
    public List<Usuario> listarUsuarios() {
        return usuarioRepository.findAll();
    }
    
    @Transactional
    public Usuario suspenderUsuario(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setBloqueado(true);
        return usuarioRepository.save(usuario);
    }
    
    @Transactional
    public void eliminarUsuarioLogico(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }
    
    @Transactional
    public List<Usuario> buscarUsuariosSospechosos() {
        return usuarioRepository.findByIntentosFallidosGreaterThan(2);
    }
} 