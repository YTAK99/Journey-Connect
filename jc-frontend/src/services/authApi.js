import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:8080"
});

export const login = (data) => {
    return API.post("/api/login", data);
};