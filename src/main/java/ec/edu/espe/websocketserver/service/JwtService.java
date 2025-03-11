package ec.edu.espe.websocketserver.service;

import ec.edu.espe.websocketserver.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    public String generateToken(Usuario usuario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", usuario.getId());
        claims.put("username", usuario.getUsername());
        claims.put("tipoUsuario", usuario.getTipoUsuario().name());
        
        return createToken(claims, usuario.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        byte[] keyBytes = secretKey.getBytes();
        Key key = Keys.hmacShaKeyFor(keyBytes);
        
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            byte[] keyBytes = secretKey.getBytes();
            Key key = Keys.hmacShaKeyFor(keyBytes);
            
            Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Claims extractAllClaims(String token) {
        byte[] keyBytes = secretKey.getBytes();
        Key key = Keys.hmacShaKeyFor(keyBytes);
        
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
} 