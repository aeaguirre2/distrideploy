package ec.edu.espe.websocketserver;

import ec.edu.espe.websocketserver.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WebsocketServerApplication implements CommandLineRunner {

    @Autowired
    private AuthService authService;

    public static void main(String[] args) {
        SpringApplication.run(WebsocketServerApplication.class, args);
    }

    @Override
    public void run(String... args) {
        // Crear usuario admin al iniciar la aplicación
        authService.crearUsuarioAdmin();
    }
} 