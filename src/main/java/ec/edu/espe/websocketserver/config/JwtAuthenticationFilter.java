package ec.edu.espe.websocketserver.config;

import ec.edu.espe.websocketserver.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/") || 
               path.equals("/index.html") ||
               path.startsWith("/api/auth/") || 
               path.startsWith("/js/") || 
               path.startsWith("/css/") || 
               path.startsWith("/images/") || 
               path.equals("/favicon.ico") || 
               path.startsWith("/subastas-ws/") ||
               path.startsWith("/api/subastas/activas");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        try {
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            String token = authHeader.substring(7);
            
            if (!jwtService.validateToken(token)) {
                throw new RuntimeException("Token inválido o expirado");
            }
            
            var claims = jwtService.extractAllClaims(token);
            var username = claims.getSubject();
            var tipoUsuario = claims.get("tipoUsuario", String.class);
            
            if (tipoUsuario == null) {
                throw new RuntimeException("Token inválido: tipo de usuario no encontrado");
            }
            
            var authentication = new UsernamePasswordAuthenticationToken(
                username,
                null,
                Collections.singletonList(new SimpleGrantedAuthority(tipoUsuario))
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
            
        } catch (Exception e) {
            logger.error("Error en la autenticación JWT: " + e.getMessage());
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
} 