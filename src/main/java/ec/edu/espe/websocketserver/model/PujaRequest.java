package ec.edu.espe.websocketserver.model;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PujaRequest {
    private Long autoId;
    private BigDecimal monto;
}