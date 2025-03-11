package ec.edu.espe.websocketserver.controller;

import ec.edu.espe.websocketserver.model.Usuario;
import ec.edu.espe.websocketserver.service.AuthService;
import ec.edu.espe.websocketserver.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.POST, RequestMethod.OPTIONS})
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtService jwtService;

    @PostMapping(value = "/registro",
                consumes = {MediaType.APPLICATION_JSON_VALUE, "application/json;charset=UTF-8"},
                produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> registrarUsuario(@RequestBody Usuario usuario) {
        try {
            System.out.println("Recibiendo petición de registro para usuario: " + usuario.getUsername());
            System.out.println("Datos recibidos: " + usuario.toString());
            
            // Validaciones básicas
            if (usuario.getUsername() == null || usuario.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El nombre de usuario es requerido"));
            }
            if (usuario.getPassword() == null || usuario.getPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "La contraseña es requerida"));
            }
            if (usuario.getEmail() == null || usuario.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El email es requerido"));
            }
            if (usuario.getNombre() == null || usuario.getNombre().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El nombre es requerido"));
            }
            if (usuario.getApellido() == null || usuario.getApellido().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El apellido es requerido"));
            }
            if (usuario.getTipoUsuario() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "El tipo de usuario es requerido"));
            }

            Usuario nuevoUsuario = authService.registrarUsuario(usuario);
            System.out.println("Usuario registrado exitosamente: " + nuevoUsuario.getUsername());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Usuario registrado exitosamente");
            response.put("usuario", nuevoUsuario);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error en el registro de usuario: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(value = "/login",
                consumes = MediaType.APPLICATION_JSON_VALUE,
                produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            Usuario usuario = authService.autenticarUsuario(request.getUsername(), request.getPassword());
            String token = jwtService.generateToken(usuario);
            
            Map<String, Object> response = new HashMap<>();
            response.put("usuario", usuario);
            response.put("token", token);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
} 