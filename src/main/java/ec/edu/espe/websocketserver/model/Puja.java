package ec.edu.espe.websocketserver.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Data
@Table(name = "pujas")
public class Puja {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auto_subasta_id")
    @JsonBackReference
    private AutoSubasta autoSubasta;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "comprador_id")
    @JsonBackReference(value = "comprador-pujas")
    private Usuario comprador;
    
    private BigDecimal monto;
    private LocalDateTime fecha;
    
    private boolean ganadora = false;
    
    @PrePersist
    public void prePersist() {
        if (fecha == null) {
            fecha = LocalDateTime.now();
        }
    }
    
    // Métodos auxiliares para acceder a la información relacionada
    @JsonProperty
    public String getTituloSubasta() {
        return autoSubasta != null && autoSubasta.getSubasta() != null ? 
            autoSubasta.getSubasta().getTitulo() : "N/A";
    }
    
    @JsonProperty
    public String getInformacionAuto() {
        if (autoSubasta != null && autoSubasta.getAuto() != null) {
            Auto auto = autoSubasta.getAuto();
            return String.format("%s %s (%d)", 
                auto.getMarca(), 
                auto.getModelo(), 
                auto.getAnio());
        }
        return "N/A";
    }
    
    @JsonProperty
    public boolean isSubastaFinalizada() {
        return autoSubasta != null && 
               autoSubasta.getSubasta() != null && 
               autoSubasta.getSubasta().isFinalizada();
    }
} 