package ec.edu.espe.websocketserver.repository;

import ec.edu.espe.websocketserver.model.AutoSubasta;
import ec.edu.espe.websocketserver.model.Puja;
import ec.edu.espe.websocketserver.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PujaRepository extends JpaRepository<Puja, Long> {
    Optional<Puja> findTopByAutoSubastaOrderByMontoDesc(AutoSubasta autoSubasta);
    int countByCompradorAndFechaAfter(Usuario comprador, LocalDateTime fecha);
    boolean existsByCompradorAndAutoSubasta(Usuario comprador, AutoSubasta autoSubasta);
    List<Puja> findByComprador_Id(Long compradorId);
    List<Puja> findByAutoSubasta(AutoSubasta autoSubasta);
    boolean existsByCompradorAndFechaAfter(Usuario comprador, LocalDateTime fecha);
} 