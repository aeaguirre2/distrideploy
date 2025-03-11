package ec.edu.espe.websocketserver.service;

import ec.edu.espe.websocketserver.model.*;
import ec.edu.espe.websocketserver.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.time.temporal.ChronoUnit;

@Service
@Slf4j
public class SubastaService {

    @Autowired
    private SubastaRepository subastaRepository;
    
    @Autowired
    private AutoRepository autoRepository;
    
    @Autowired
    private AutoSubastaRepository autoSubastaRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private PujaRepository pujaRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedRate = 1000) // Ejecutar cada segundo
    @Transactional
    public void verificarSubastasVencidas() {
        log.info("Verificando subastas vencidas...");
        List<Subasta> subastasActivas = subastaRepository.findByActivaTrueAndCanceladaFalseAndFechaFinBefore(LocalDateTime.now());
        
        for (Subasta subasta : subastasActivas) {
            try {
                finalizarSubasta(subasta.getId());
                log.info("Subasta {} finalizada automáticamente", subasta.getId());
            } catch (Exception e) {
                log.error("Error al finalizar subasta {}: {}", subasta.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    public Subasta crearSubasta(Subasta subasta, List<Long> autoIds) {
        // Validar que todos los campos requeridos estén presentes
        if (subasta.getFechaInicio() == null) {
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
        }
        
        if (subasta.getFechaFin() == null) {
            throw new IllegalArgumentException("La fecha de fin es obligatoria");
        }

        if (subasta.getTitulo() == null || subasta.getTitulo().trim().isEmpty()) {
            throw new IllegalArgumentException("El título es obligatorio");
        }

        if (subasta.getDescripcion() == null || subasta.getDescripcion().trim().isEmpty()) {
            throw new IllegalArgumentException("La descripción es obligatoria");
        }
        
        // Validar que la fecha de inicio sea futura
        if (subasta.getFechaInicio().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("La fecha de inicio debe ser posterior a la fecha actual");
        }
        
        // Validar que la fecha de fin sea posterior a la de inicio
        if (subasta.getFechaFin().isBefore(subasta.getFechaInicio())) {
            throw new IllegalArgumentException("La fecha de fin debe ser posterior a la fecha de inicio");
        }

        // Validar duración mínima y máxima
        long duracionMinutos = java.time.Duration.between(subasta.getFechaInicio(), subasta.getFechaFin()).toMinutes();
        if (duracionMinutos < 10) {
            throw new IllegalArgumentException("La subasta debe durar al menos 10 minutos");
        }
        if (duracionMinutos > 120) {
            throw new IllegalArgumentException("La subasta no puede durar más de 2 horas");
        }
        
        // Validar autos seleccionados
        if (autoIds == null || autoIds.isEmpty()) {
            throw new IllegalArgumentException("Debe seleccionar al menos un auto para la subasta");
        }
        
        List<Auto> autos = autoRepository.findAllById(autoIds);
        
        // Validar que se encontraron todos los autos
        if (autos.size() != autoIds.size()) {
            throw new IllegalArgumentException("Uno o más autos seleccionados no existen");
        }
        
        // Validar que los autos no estén vendidos o en otra subasta activa
        for (Auto auto : autos) {
            if (auto.isVendido()) {
                throw new IllegalArgumentException("El auto " + auto.getMarca() + " " + auto.getModelo() + " ya está vendido");
            }
            if (auto.isEnSubasta()) {
                throw new IllegalArgumentException("El auto " + auto.getMarca() + " " + auto.getModelo() + " ya está en otra subasta");
            }
        }
        
        subasta.setActiva(true);
        subasta.setCancelada(false);
        subasta.setFinalizada(false);
        
        Subasta subastaGuardada = subastaRepository.save(subasta);
        
        // Crear AutoSubasta para cada auto
        for (Auto auto : autos) {
            AutoSubasta autoSubasta = new AutoSubasta();
            autoSubasta.setAuto(auto);
            autoSubasta.setSubasta(subastaGuardada);
            autoSubasta.setPrecioFinal(auto.getPrecioBase());
            autoSubastaRepository.save(autoSubasta);
            
            // Actualizar estado del auto
            auto.setEnSubasta(true);
            autoRepository.save(auto);
        }
        
        return subastaGuardada;
    }

    public List<Subasta> obtenerSubastasActivas() {
        return subastaRepository.findByActivaTrueAndCanceladaFalseAndFechaFinAfter(LocalDateTime.now());
    }

    public List<Subasta> obtenerSubastasVendedor(Usuario vendedor) {
        return subastaRepository.findByVendedor(vendedor);
    }

    @Transactional
    public void procesarPuja(Long subastaId, Long autoId, Usuario comprador, BigDecimal monto) {
        Subasta subasta = subastaRepository.findById(subastaId)
            .orElseThrow(() -> new IllegalArgumentException("Subasta no encontrada"));
            
        if (!subasta.isActiva() || subasta.isCancelada()) {
            throw new IllegalArgumentException("La subasta no está activa");
        }
        
        if (LocalDateTime.now().isBefore(subasta.getFechaInicio())) {
            throw new IllegalArgumentException("La subasta aún no ha comenzado");
        }
        
        if (LocalDateTime.now().isAfter(subasta.getFechaFin())) {
            throw new IllegalArgumentException("La subasta ya ha finalizado");
        }
        
        AutoSubasta autoSubasta = autoSubastaRepository.findBySubastaIdAndAutoId(subastaId, autoId)
            .orElseThrow(() -> new IllegalArgumentException("Auto no encontrado en la subasta"));
            
        if (autoSubasta.isVendido()) {
            throw new IllegalArgumentException("Este auto ya ha sido vendido");
        }
        
        // Validar que el comprador no sea el vendedor
        if (comprador.getId().equals(subasta.getVendedor().getId())) {
            throw new IllegalArgumentException("El vendedor no puede pujar por sus propios autos");
        }

        // Validar que el comprador esté activo y no bloqueado
        if (!comprador.isActivo()) {
            throw new IllegalArgumentException("Su cuenta está inactiva");
        }
        if (comprador.isBloqueado()) {
            throw new IllegalArgumentException("Su cuenta está bloqueada");
        }
        
        // Obtener el precio actual
        BigDecimal precioActual = autoSubasta.getPrecioFinal();
        
        // Validar que el monto sea mayor al precio actual por al menos 1 dólar
        if (monto.compareTo(precioActual.add(BigDecimal.ONE)) < 0) {
            throw new IllegalArgumentException("El monto debe ser mayor al precio actual por al menos $1.00");
        }

        // Validar que no haya realizado más de 50 pujas en la última hora
        LocalDateTime unaHoraAtras = LocalDateTime.now().minusHours(1);
        long pujasUltimaHora = pujaRepository.countByCompradorAndFechaAfter(comprador, unaHoraAtras);
        if (pujasUltimaHora >= 50) {
            throw new IllegalArgumentException("Ha excedido el límite de pujas por hora (50)");
        }

        // Validar que no haya realizado una puja en los últimos 5 segundos
        LocalDateTime cincuSegundosAtras = LocalDateTime.now().minusSeconds(5);
        if (pujaRepository.existsByCompradorAndFechaAfter(comprador, cincuSegundosAtras)) {
            throw new IllegalArgumentException("Debe esperar al menos 5 segundos entre pujas");
        }

        // Crear y guardar la puja
        Puja puja = new Puja();
        puja.setAutoSubasta(autoSubasta);
        puja.setComprador(comprador);
        puja.setMonto(monto);
        puja.setFecha(LocalDateTime.now());
        pujaRepository.save(puja);
        
        // Actualizar el precio final en AutoSubasta
        autoSubasta.setPrecioFinal(monto);
        autoSubastaRepository.save(autoSubasta);
        
        // Notificar a todos los usuarios sobre la nueva puja
        messagingTemplate.convertAndSend("/topic/subastas/" + subastaId, 
            Map.of(
                "type", "NEW_BID",
                "subastaId", subastaId,
                "autoId", autoId,
                "monto", monto,
                "comprador", comprador.getUsername()
            )
        );
    }

    @Transactional
    public void finalizarSubasta(Long subastaId) {
        Subasta subasta = subastaRepository.findById(subastaId)
            .orElseThrow(() -> new IllegalArgumentException("Subasta no encontrada"));
            
        if (!subasta.isActiva() || subasta.isFinalizada()) {
            throw new IllegalArgumentException("La subasta ya está finalizada");
        }
        
        subasta.setActiva(false);
        subasta.setFinalizada(true);
        
        // Procesar cada auto en la subasta
        for (AutoSubasta autoSubasta : subasta.getAutos()) {
            List<Puja> pujas = pujaRepository.findByAutoSubasta(autoSubasta);
            Puja ultimaPuja = pujas.stream()
                .max((p1, p2) -> p1.getMonto().compareTo(p2.getMonto()))
                .orElse(null);
                
            Auto auto = autoSubasta.getAuto();
            
            if (ultimaPuja != null && ultimaPuja.getMonto().compareTo(auto.getPrecioBase()) >= 0) {
                // Venta exitosa
                auto.setVendido(true);
                auto.setComprador(ultimaPuja.getComprador());
                autoSubasta.setVendido(true);
                autoSubasta.setPrecioFinal(ultimaPuja.getMonto());
                ultimaPuja.setGanadora(true);
                
                // Notificar al ganador
                messagingTemplate.convertAndSendToUser(
                    ultimaPuja.getComprador().getUsername(),
                    "/queue/notifications",
                    Map.of(
                        "type", "AUCTION_WON",
                        "message", String.format("¡Felicitaciones! Has ganado la subasta del auto %s %s por $%s", 
                            auto.getMarca(), 
                            auto.getModelo(),
                            ultimaPuja.getMonto()),
                        "subastaId", subastaId,
                        "autoId", auto.getId(),
                        "monto", ultimaPuja.getMonto()
                    )
                );
            } else {
                // No se alcanzó el precio mínimo
                auto.setEnSubasta(false);
                
                // Notificar a los participantes que no ganaron
                for (Puja puja : pujas) {
                    messagingTemplate.convertAndSendToUser(
                        puja.getComprador().getUsername(),
                        "/queue/notifications",
                        Map.of(
                            "type", "AUCTION_FAILED",
                            "message", String.format("La subasta del auto %s %s ha finalizado sin alcanzar el precio mínimo", 
                                auto.getMarca(), 
                                auto.getModelo()),
                            "subastaId", subastaId,
                            "autoId", auto.getId()
                        )
                    );
                }
            }
            
            autoRepository.save(auto);
            autoSubastaRepository.save(autoSubasta);
            if (ultimaPuja != null) {
                pujaRepository.save(ultimaPuja);
            }
        }
        
        subastaRepository.save(subasta);
        
        // Notificar a todos los usuarios que la subasta ha finalizado
        messagingTemplate.convertAndSend("/topic/subastas/" + subastaId, 
            Map.of(
                "type", "SUBASTA_FINALIZADA",
                "subastaId", subastaId,
                "message", "La subasta ha finalizado"
            )
        );
    }

    public List<Subasta> obtenerSubastasFinalizadas() {
        return subastaRepository.findByEstadoOrderByFechaFinDesc("FINALIZADA");
    }

    public java.util.Optional<Subasta> obtenerSubastaPorId(Long id) {
        return subastaRepository.findById(id);
    }

    @Transactional
    public void cancelarSubasta(Long subastaId) {
        Subasta subasta = subastaRepository.findById(subastaId)
            .orElseThrow(() -> new IllegalArgumentException("Subasta no encontrada"));
            
        if (subasta.isFinalizada()) {
            throw new IllegalArgumentException("No se puede cancelar una subasta finalizada");
        }
        
        if (subasta.isCancelada()) {
            throw new IllegalArgumentException("La subasta ya está cancelada");
        }
        
        if (LocalDateTime.now().isAfter(subasta.getFechaInicio())) {
            throw new IllegalArgumentException("No se puede cancelar una subasta que ya ha comenzado");
        }
        
        // Marcar la subasta como cancelada
        subasta.setCancelada(true);
        subasta.setActiva(false);
        
        // Liberar los autos de la subasta
        for (AutoSubasta autoSubasta : subasta.getAutos()) {
            Auto auto = autoSubasta.getAuto();
            auto.setEnSubasta(false);
            autoRepository.save(auto);
        }
        
        subastaRepository.save(subasta);
        
        // Notificar a través de WebSocket
        messagingTemplate.convertAndSend("/topic/subastas", 
            Map.of(
                "type", "SUBASTA_FINALIZADA",
                "subastaId", subastaId,
                "message", "La subasta ha sido cancelada"
            )
        );
    }

    public Subasta actualizarSubasta(Subasta subasta, List<Long> autosIds) {
        // Validar que al menos haya un auto
        if (autosIds == null || autosIds.isEmpty()) {
            throw new IllegalArgumentException("Debe incluir al menos un auto en la subasta");
        }

        // Validar fechas
        LocalDateTime ahora = LocalDateTime.now();
        if (subasta.getFechaInicio().isBefore(ahora)) {
            throw new IllegalArgumentException("La fecha de inicio debe ser posterior a la fecha actual");
        }
        if (subasta.getFechaFin().isBefore(subasta.getFechaInicio())) {
            throw new IllegalArgumentException("La fecha de fin debe ser posterior a la fecha de inicio");
        }

        // Validar duración (entre 10 minutos y 2 horas)
        long duracionMinutos = ChronoUnit.MINUTES.between(subasta.getFechaInicio(), subasta.getFechaFin());
        if (duracionMinutos < 10) {
            throw new IllegalArgumentException("La subasta debe durar al menos 10 minutos");
        }
        if (duracionMinutos > 120) {
            throw new IllegalArgumentException("La subasta no puede durar más de 2 horas");
        }

        // Obtener los autos actuales y liberar los que ya no estarán en la subasta
        List<AutoSubasta> autosActuales = subasta.getAutos();
        for (AutoSubasta autoSubasta : autosActuales) {
            if (!autosIds.contains(autoSubasta.getAuto().getId())) {
                Auto auto = autoSubasta.getAuto();
                auto.setEnSubasta(false);
                autoRepository.save(auto);
            }
        }

        // Limpiar la lista actual de autos
        subasta.getAutos().clear();

        // Agregar los autos seleccionados
        for (Long autoId : autosIds) {
            Auto auto = autoRepository.findById(autoId)
                .orElseThrow(() -> new IllegalArgumentException("Auto no encontrado: " + autoId));

            if (auto.isEnSubasta() && !autosActuales.stream()
                    .anyMatch(as -> as.getAuto().getId().equals(autoId))) {
                throw new IllegalArgumentException("El auto " + auto.getMarca() + " " + auto.getModelo() + " ya está en otra subasta");
            }

            auto.setEnSubasta(true);
            autoRepository.save(auto);

            AutoSubasta autoSubasta = new AutoSubasta();
            autoSubasta.setAuto(auto);
            autoSubasta.setSubasta(subasta);
            autoSubasta.setPrecioFinal(auto.getPrecioBase());
            subasta.getAutos().add(autoSubasta);
        }

        return subastaRepository.save(subasta);
    }
} 