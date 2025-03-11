package ec.edu.espe.websocketserver.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
@Table(name = "autos")
public class Auto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String marca;
    private String modelo;
    private Integer anio;
    private String descripcion;
    private BigDecimal precioBase;
    private boolean vendido = false;
    private boolean enSubasta = false;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendedor_id")
    @JsonIgnore
    private Usuario vendedor;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "comprador_id")
    @JsonIgnore
    private Usuario comprador;
    
    @OneToMany(mappedBy = "auto", fetch = FetchType.EAGER)
    @JsonIgnore
    private List<AutoSubasta> subastas = new ArrayList<>();
    
    private boolean activo = true;
    
    @PreUpdate
    @PrePersist
    public void actualizarEstado() {
        if (vendido) {
            enSubasta = false;
        } else {
            enSubasta = subastas.stream()
                .anyMatch(as -> as.getSubasta().isActiva() && !as.getSubasta().isCancelada());
        }
    }
} 