package ec.edu.espe.websocketserver.repository;

import ec.edu.espe.websocketserver.model.Auto;
import ec.edu.espe.websocketserver.model.AutoSubasta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AutoSubastaRepository extends JpaRepository<AutoSubasta, Long> {
    boolean existsByAutoAndSubasta_ActivaTrue(Auto auto);
    Optional<AutoSubasta> findBySubastaIdAndAutoId(Long subastaId, Long autoId);
} 