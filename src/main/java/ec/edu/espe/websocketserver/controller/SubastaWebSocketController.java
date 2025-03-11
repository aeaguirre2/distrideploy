package ec.edu.espe.websocketserver.controller;

import ec.edu.espe.websocketserver.model.*;
import ec.edu.espe.websocketserver.service.SubastaService;
import ec.edu.espe.websocketserver.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.HashMap;
import java.util.Map;

import java.math.BigDecimal;
import java.security.Principal;

@Controller
public class SubastaWebSocketController {

    @Autowired
    private SubastaService subastaService;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/subastas/{subastaId}/pujar")
    public void procesarPuja(@DestinationVariable Long subastaId, PujaRequest request, Principal principal) {
        Map<String, Object> response = new HashMap<>();
        try {
            Usuario comprador = usuarioRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
                
            if (comprador.getTipoUsuario() != Usuario.TipoUsuario.COMPRADOR) {
                throw new IllegalArgumentException("Solo los compradores pueden realizar pujas");
            }
            
            subastaService.procesarPuja(subastaId, request.getAutoId(), comprador, request.getMonto());
            
            response.put("success", true);
            response.put("message", "Puja realizada exitosamente");
            
            // Notificar a todos los usuarios sobre la actualización de la subasta
            messagingTemplate.convertAndSend("/topic/subastas/" + subastaId, 
                Map.of("type", "UPDATE_SUBASTA", "subastaId", subastaId));
                
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        
        // Enviar respuesta solo al usuario que realizó la puja
        messagingTemplate.convertAndSendToUser(
            principal.getName(),
            "/queue/pujas",
            response
        );
    }

    @MessageMapping("/subastas/{subastaId}/finalizar")
    public void finalizarSubasta(@DestinationVariable Long subastaId, Principal principal) {
        try {
            Usuario usuario = usuarioRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
                
            if (usuario.getTipoUsuario() != Usuario.TipoUsuario.ADMIN) {
                throw new IllegalArgumentException("Solo los administradores pueden finalizar subastas");
            }
            
            subastaService.finalizarSubasta(subastaId);
            
            // Notificar a todos los usuarios que la subasta ha finalizado
            messagingTemplate.convertAndSend("/topic/subastas/" + subastaId, 
                Map.of("type", "SUBASTA_FINALIZADA", "subastaId", subastaId));
                
        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                Map.of("message", e.getMessage())
            );
        }
    }

    public static class PujaRequest {
        private Long autoId;
        private BigDecimal monto;

        // Getters y setters
        public Long getAutoId() { return autoId; }
        public void setAutoId(Long autoId) { this.autoId = autoId; }
        
        public BigDecimal getMonto() { return monto; }
        public void setMonto(BigDecimal monto) { this.monto = monto; }
    }
} 