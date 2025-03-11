package ec.edu.espe.websocketserver.controller;

import ec.edu.espe.websocketserver.model.Auto;
import ec.edu.espe.websocketserver.model.Usuario;
import ec.edu.espe.websocketserver.repository.AutoRepository;
import ec.edu.espe.websocketserver.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/autos")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class AutoController {

    @Autowired
    private AutoRepository autoRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostMapping(value = "/registrar",
                consumes = MediaType.APPLICATION_JSON_VALUE,
                produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> registrarAuto(@RequestBody Auto auto) {
        try {
            System.out.println("Recibiendo petición para registrar auto: " + auto);
            
            // Obtener el usuario autenticado
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            System.out.println("Usuario autenticado: " + auth.getName());
            
            Usuario vendedor = usuarioRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            System.out.println("Vendedor encontrado: " + vendedor);

            // Verificar que el usuario sea vendedor o admin
            if (vendedor.getTipoUsuario() != Usuario.TipoUsuario.VENDEDOR && 
                vendedor.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos para registrar autos");
            }

            // Verificar que el vendedor esté activo
            if (!vendedor.isActivo()) {
                return ResponseEntity.status(403).body("Su cuenta está inactiva");
            }

            // Validaciones del auto
            if (auto.getMarca() == null || auto.getMarca().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("La marca es requerida");
            }
            if (auto.getModelo() == null || auto.getModelo().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("El modelo es requerido");
            }
            if (auto.getAnio() == null) {
                return ResponseEntity.badRequest().body("El año es requerido");
            }
            if (auto.getAnio() < 1900 || auto.getAnio() > java.time.Year.now().getValue() + 1) {
                return ResponseEntity.badRequest().body("Año del auto inválido");
            }
            if (auto.getDescripcion() == null || auto.getDescripcion().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("La descripción es requerida");
            }
            if (auto.getPrecioBase() == null || auto.getPrecioBase().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body("El precio base debe ser mayor a 0");
            }

            // Asignar el vendedor al auto
            auto.setVendedor(vendedor);
            auto.setVendido(false);
            auto.setEnSubasta(false);
            auto.setActivo(true);

            Auto autoGuardado = autoRepository.save(auto);
            System.out.println("Auto guardado exitosamente: " + autoGuardado);
            
            return ResponseEntity.ok(autoGuardado);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error al registrar el auto: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerAuto(@PathVariable Long id) {
        return autoRepository.findById(id)
                .map(auto -> {
                    // Verificar si el auto está activo
                    if (!auto.isActivo()) {
                        return ResponseEntity.status(404).body("Auto no disponible");
                    }
                    return ResponseEntity.ok(auto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/vendedor")
    public ResponseEntity<?> obtenerAutosVendedorActual() {
        try {
            // Obtener el usuario autenticado
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Usuario vendedor = usuarioRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            // Verificar que el usuario sea vendedor o admin
            if (vendedor.getTipoUsuario() != Usuario.TipoUsuario.VENDEDOR && 
                vendedor.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos para ver los autos");
            }

            List<Auto> autos = autoRepository.findByVendedorAndActivoTrue(vendedor);
            return ResponseEntity.ok(autos);
        } catch (Exception e) {
            e.printStackTrace(); // Para debug
            return ResponseEntity.badRequest().body("Error al obtener los autos: " + e.getMessage());
        }
    }

    @GetMapping("/vendedor/{vendedorId}")
    public ResponseEntity<?> obtenerAutosPorVendedor(@PathVariable Long vendedorId) {
        // Verificar permisos
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Usuario usuarioActual = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Solo el propio vendedor o un admin pueden ver los autos de un vendedor
        if (!usuarioActual.getId().equals(vendedorId) && 
            usuarioActual.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
            return ResponseEntity.status(403).body("No tiene permisos para ver estos autos");
        }

        return ResponseEntity.ok(autoRepository.findByVendedorIdAndActivoTrue(vendedorId));
    }

    @PutMapping("/{id}/actualizar")
    public ResponseEntity<?> actualizarAuto(@PathVariable Long id, @RequestBody Auto autoActualizado, Authentication auth) {
        try {
            Usuario vendedor = usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            if (vendedor.getTipoUsuario() != Usuario.TipoUsuario.VENDEDOR && 
                vendedor.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos para actualizar autos");
            }

            Auto auto = autoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Auto no encontrado"));

            // Verificar que el auto pertenezca al vendedor
            if (!auto.getVendedor().getId().equals(vendedor.getId()) && 
                vendedor.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                return ResponseEntity.status(403).body("No tiene permisos para editar este auto");
            }

            // Verificar que el auto esté disponible
            if (auto.isVendido() || auto.isEnSubasta()) {
                return ResponseEntity.badRequest().body("No se puede editar un auto que está vendido o en subasta");
            }

            // Actualizar solo los campos permitidos
            auto.setMarca(autoActualizado.getMarca());
            auto.setModelo(autoActualizado.getModelo());
            auto.setAnio(autoActualizado.getAnio());
            auto.setDescripcion(autoActualizado.getDescripcion());
            auto.setPrecioBase(autoActualizado.getPrecioBase());

            autoRepository.save(auto);
            return ResponseEntity.ok(auto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al actualizar el auto: " + e.getMessage());
        }
    }
} 