package ec.edu.espe.websocketserver.repository;

import ec.edu.espe.websocketserver.model.Subasta;
import ec.edu.espe.websocketserver.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SubastaRepository extends JpaRepository<Subasta, Long> {
    List<Subasta> findByActivaTrueAndCanceladaFalseAndFechaFinAfter(LocalDateTime fecha);
    List<Subasta> findByVendedor(Usuario vendedor);
    
    List<Subasta> findByActivaTrueAndCanceladaFalseAndFechaFinBefore(LocalDateTime fecha);
    
    @Query("SELECT DISTINCT s FROM Subasta s JOIN s.autos a JOIN a.auto auto WHERE auto.vendedor = :vendedor AND s.activa = true")
    List<Subasta> findByAutosVendedorAndActivaTrue(@Param("vendedor") Usuario vendedor);
    
    @Query("SELECT s FROM Subasta s WHERE s.activa = true AND s.fechaFin > CURRENT_TIMESTAMP")
    List<Subasta> findActiveAuctions();

    @Query("SELECT s FROM Subasta s WHERE s.activa = false AND s.finalizada = true ORDER BY s.fechaFin DESC")
    List<Subasta> findByEstado(String estado);

    @Query("SELECT s FROM Subasta s WHERE s.activa = false AND s.finalizada = true ORDER BY s.fechaFin DESC")
    List<Subasta> findByEstadoOrderByFechaFinDesc(String estado);
} 