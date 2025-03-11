package ec.edu.espe.websocketserver.repository;

import ec.edu.espe.websocketserver.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    boolean existsByUsername(String username);
    List<Usuario> findByIntentosFallidosGreaterThan(int intentos);
} 