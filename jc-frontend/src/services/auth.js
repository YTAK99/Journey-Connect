// src/services/auth.js

// 회원가입
export const signup = (user) => {

    const users =
      JSON.parse(localStorage.getItem("users")) || [];
  
    // 아이디 중복 체크
    const exists = users.find(
      (item) => item.id === user.id
    );
  
    if (exists) {
      return false;
    }
  
  
    users.push(user);
  
    localStorage.setItem(
      "users",
      JSON.stringify(users)
    );
  
    return true;
  };
  
  
  
  // 로그인
  export const login = (id, pw) => {
  
    const users =
      JSON.parse(localStorage.getItem("users")) || [];
  
  
    const user = users.find(
      (item) =>
        item.id === id &&
        item.pw === pw
    );
  
  
    if(user){
  
      localStorage.setItem(
        "loginUser",
        JSON.stringify(user)
      );
  
      return true;
    }
  
  
    return false;
  };
  
  
  
  // 로그아웃
  export const logout = () => {
  
    localStorage.removeItem(
      "loginUser"
    );
  
  };
  
  
  
  // 현재 로그인 사용자
  export const getUser = () => {
  
    return JSON.parse(
      localStorage.getItem("loginUser")
    );
  
  };