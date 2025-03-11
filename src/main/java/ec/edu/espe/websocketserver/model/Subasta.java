package ec.edu.espe.websocketserver.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity
@Data
@Table(name = "subastas")
public class Subasta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;
    private boolean activa = true;
    private boolean cancelada = false;
    private boolean finalizada = false;
    
    @OneToMany(mappedBy = "subasta", fetch = FetchType.EAGER)
    @JsonManagedReference(value = "subasta-autos")
    private List<AutoSubasta> autos = new ArrayList<>();
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendedor_id")
    private Usuario vendedor;
    
    private BigDecimal precioActual;
    private BigDecimal precioMinimo;
    
    @PrePersist
    public void prePersist() {
        if (autos != null && !autos.isEmpty()) {
            precioMinimo = autos.stream()
                .map(autoSubasta -> autoSubasta.getAuto().getPrecioBase())
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
            precioActual = precioMinimo;
        }
    }
} 