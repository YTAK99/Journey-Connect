package com.jc.backend.intelligence.journeyai;

@FunctionalInterface
interface JourneyAiModelClient {
    String chat(String systemPrompt, String userPrompt);
}
