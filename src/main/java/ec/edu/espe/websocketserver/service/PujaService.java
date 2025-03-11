package ec.edu.espe.websocketserver.service;

import ec.edu.espe.websocketserver.model.Puja;
import ec.edu.espe.websocketserver.model.Auto;
import ec.edu.espe.websocketserver.model.Subasta;
import ec.edu.espe.websocketserver.model.AutoSubasta;
import ec.edu.espe.websocketserver.repository.PujaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PujaService {

    @Autowired
    private PujaRepository pujaRepository;

    @Transactional(readOnly = true)
    public List<Puja> getPujasByCompradorId(Long compradorId) {
        List<Puja> pujas = pujaRepository.findByComprador_Id(compradorId);
        
        // Forzar la carga de las relaciones
        pujas.forEach(puja -> {
            AutoSubasta autoSubasta = puja.getAutoSubasta();
            if (autoSubasta != null) {
                // Forzar la carga del auto y la subasta
                Auto auto = autoSubasta.getAuto();
                Subasta subasta = autoSubasta.getSubasta();
                
                // Acceder a las propiedades para asegurar que se carguen
                if (auto != null) {
                    auto.getMarca();
                    auto.getModelo();
                    auto.getAnio();
                }
                if (subasta != null) {
                    subasta.getTitulo();
                    subasta.isActiva();
                }
            }
        });
        
        return pujas;
    }
} 