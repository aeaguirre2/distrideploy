package ec.edu.espe.websocketserver.model;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class SubastaRequest {
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;
    private List<Long> autosIds;
}