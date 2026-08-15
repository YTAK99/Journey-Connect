package com.jc.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ThirdPhaseSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void myLikesRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/users/me/likes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void userReportCreationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/posts/1/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reasonCategory":"spam","reasonDetail":"detail"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }
}
