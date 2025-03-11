package ec.edu.espe.websocketserver.service;

import ec.edu.espe.websocketserver.model.Auto;
import ec.edu.espe.websocketserver.model.Usuario;
import ec.edu.espe.websocketserver.repository.AutoRepository;
import ec.edu.espe.websocketserver.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AutoService {

    @Autowired
    private AutoRepository autoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<Auto> obtenerAutosDisponiblesPorVendedor(String username) {
        Usuario vendedor = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                
        return autoRepository.findByVendedorAndVendidoFalseAndActivoTrue(vendedor);
    }

    @Transactional(readOnly = true)
    public List<Auto> obtenerAutosPorVendedor(String username) {
        Usuario vendedor = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                
        return autoRepository.findByVendedorAndActivoTrue(vendedor);
    }

    @Transactional
    public Auto registrarAuto(Auto auto, String username) {
        Usuario vendedor = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                
        if (vendedor.getTipoUsuario() != Usuario.TipoUsuario.VENDEDOR && 
            vendedor.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
            throw new RuntimeException("No tiene permisos para registrar autos");
        }
        
        auto.setVendedor(vendedor);
        auto.setVendido(false);
        auto.setActivo(true);
        
        return autoRepository.save(auto);
    }
} 