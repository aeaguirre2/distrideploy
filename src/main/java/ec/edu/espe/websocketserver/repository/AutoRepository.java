package ec.edu.espe.websocketserver.repository;

import ec.edu.espe.websocketserver.model.Auto;
import ec.edu.espe.websocketserver.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AutoRepository extends JpaRepository<Auto, Long> {
    List<Auto> findByVendedorIdAndActivoTrue(Long vendedorId);
    List<Auto> findByVendedorAndVendidoFalseAndActivoTrue(Usuario vendedor);
    List<Auto> findByVendedorAndActivoTrue(Usuario vendedor);
} 