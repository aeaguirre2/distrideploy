package ec.edu.espe.websocketserver.controller;

import ec.edu.espe.websocketserver.model.Usuario;
import ec.edu.espe.websocketserver.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping("/usuarios")
    public ResponseEntity<?> obtenerUsuarios(Authentication auth) {
        try {
            Usuario admin = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            if (admin.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos de administrador");
            }

            List<Usuario> usuarios = usuarioRepository.findAll();
            return ResponseEntity.ok(usuarios);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al obtener la lista de usuarios: " + e.getMessage());
        }
    }

    @PutMapping("/usuarios/{id}/activar")
    public ResponseEntity<?> activarUsuario(@PathVariable Long id, Authentication auth) {
        try {
            Usuario admin = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            if (admin.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos de administrador");
            }

            Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            usuario.setActivo(true);
            usuarioRepository.save(usuario);
            return ResponseEntity.ok(usuario);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al activar el usuario: " + e.getMessage());
        }
    }

    @PutMapping("/usuarios/{id}/desactivar")
    public ResponseEntity<?> desactivarUsuario(@PathVariable Long id, Authentication auth) {
        try {
            Usuario admin = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            if (admin.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos de administrador");
            }

            Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            usuario.setActivo(false);
            usuarioRepository.save(usuario);
            return ResponseEntity.ok(usuario);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al desactivar el usuario: " + e.getMessage());
        }
    }

    @PutMapping("/usuarios/{id}/actualizar")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody Usuario usuarioActualizado, Authentication auth) {
        try {
            Usuario admin = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            if (admin.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos de administrador");
            }

            Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            // Actualizar solo los campos permitidos
            usuario.setNombre(usuarioActualizado.getNombre());
            usuario.setApellido(usuarioActualizado.getApellido());
            usuario.setEmail(usuarioActualizado.getEmail());
            usuario.setTipoUsuario(usuarioActualizado.getTipoUsuario());

            usuarioRepository.save(usuario);
            return ResponseEntity.ok(usuario);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al actualizar el usuario: " + e.getMessage());
        }
    }

    @GetMapping("/usuarios/{id}")
    public ResponseEntity<?> obtenerUsuario(@PathVariable Long id, Authentication auth) {
        try {
            Usuario admin = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            if (admin.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos de administrador");
            }

            Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            return ResponseEntity.ok(usuario);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al obtener el usuario: " + e.getMessage());
        }
    }
} 