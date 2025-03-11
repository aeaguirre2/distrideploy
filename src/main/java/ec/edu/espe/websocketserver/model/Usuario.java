package ec.edu.espe.websocketserver.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.*;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "usuarios")
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true)
    private String username;
    
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    
    private String email;
    private String nombre;
    private String apellido;
    
    @Enumerated(EnumType.STRING)
    private TipoUsuario tipoUsuario;
    
    @OneToMany(mappedBy = "vendedor")
    @JsonIgnore
    private List<Auto> autosVendedor = new ArrayList<>();
    
    @OneToMany(mappedBy = "comprador")
    @JsonIgnore
    private List<Auto> autosComprador = new ArrayList<>();
    
    @OneToMany(mappedBy = "comprador")
    @JsonIgnore
    private List<AutoSubasta> autosSubasta = new ArrayList<>();
    
    @OneToMany(mappedBy = "comprador")
    @JsonIgnore
    private List<Puja> pujas = new ArrayList<>();
    
    private boolean activo = true;
    private boolean bloqueado = false;
    private LocalDateTime ultimoAcceso;
    private int intentosFallidos = 0;
    private LocalDateTime fechaBloqueo;
    
    public enum TipoUsuario {
        ADMIN,
        VENDEDOR,
        COMPRADOR
    }
    
    public boolean isBloqueado() {
        if (bloqueado && fechaBloqueo != null) {
            // Si han pasado más de 24 horas desde el bloqueo, desbloqueamos automáticamente
            if (fechaBloqueo.plusHours(24).isBefore(LocalDateTime.now())) {
                bloqueado = false;
                intentosFallidos = 0;
                fechaBloqueo = null;
                return false;
            }
        }
        return bloqueado;
    }
    
    public void setBloqueado(boolean bloqueado) {
        this.bloqueado = bloqueado;
        if (bloqueado) {
            this.fechaBloqueo = LocalDateTime.now();
        } else {
            this.fechaBloqueo = null;
            this.intentosFallidos = 0;
        }
    }
    
    public void incrementarIntentosFallidos() {
        this.intentosFallidos++;
        if (this.intentosFallidos >= 3) {
            this.setBloqueado(true);
        }
    }
    
    public void resetearIntentosFallidos() {
        this.intentosFallidos = 0;
    }
    
    @Override
    public String toString() {
        return "Usuario{" +
            "id=" + id +
            ", username='" + username + '\'' +
            ", email='" + email + '\'' +
            ", nombre='" + nombre + '\'' +
            ", apellido='" + apellido + '\'' +
            ", tipoUsuario=" + tipoUsuario +
            ", activo=" + activo +
            '}';
    }
} 