package ec.edu.espe.websocketserver.controller;

import ec.edu.espe.websocketserver.model.Puja;
import ec.edu.espe.websocketserver.service.PujaService;
import ec.edu.espe.websocketserver.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pujas")
public class PujaController {

    @Autowired
    private PujaService pujaService;

    @Autowired
    private AuthService authService;

    @GetMapping("/comprador")
    public ResponseEntity<List<Puja>> getPujasByComprador(Authentication authentication) {
        String username = authentication.getName();
        Long compradorId = authService.obtenerUsuarioPorUsername(username).getId();
        List<Puja> pujas = pujaService.getPujasByCompradorId(compradorId);
        return ResponseEntity.ok(pujas);
    }
} 