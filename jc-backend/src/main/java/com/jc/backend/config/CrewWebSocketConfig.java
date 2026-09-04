package com.jc.backend.config;

import com.jc.backend.crew.chat.CrewChatService;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class CrewWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Pattern CREW_DESTINATION =
            Pattern.compile("^/(?:app|topic)/crews/(\\d+)(?:/messages)?$");

    private final JwtDecoder jwtDecoder;
    private final CrewChatService chatService;
    private final List<String> allowedOrigins;

    public CrewWebSocketConfig(
            JwtDecoder jwtDecoder,
            CrewChatService chatService,
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
        this.jwtDecoder = jwtDecoder;
        this.chatService = chatService;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setPreservePublishOrder(true);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                        message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    authenticate(accessor);
                }
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                        || StompCommand.SEND.equals(accessor.getCommand())) {
                    authorizeCrew(accessor);
                }
                return message;
            }
        });
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("WebSocket authentication is required");
        }
        Jwt jwt = jwtDecoder.decode(authorization.substring(7));
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                jwt.getSubject(), null, List.of()));
    }

    private void authorizeCrew(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new IllegalArgumentException("WebSocket authentication is required");
        }
        String destination = accessor.getDestination();
        Matcher matcher = CREW_DESTINATION.matcher(destination == null ? "" : destination);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Unsupported WebSocket destination");
        }
        chatService.requireParticipant(
                Long.parseLong(accessor.getUser().getName()),
                Long.parseLong(matcher.group(1)));
    }
}
