package ec.edu.espe.websocketserver.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "auto_subasta")
public class AutoSubasta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "auto_id")
    private Auto auto;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subasta_id")
    @JsonBackReference(value = "subasta-autos")
    private Subasta subasta;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "comprador_id")
    @JsonBackReference(value = "comprador-autosubasta")
    private Usuario comprador;
    
    @OneToMany(mappedBy = "autoSubasta", fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Puja> pujas = new ArrayList<>();
    
    private BigDecimal precioFinal;
    private boolean vendido = false;
} 