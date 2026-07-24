import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="w-screen h-screen bg-[url('/home_img_1.png')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex flex-col items-start justify-center min-h-screen px-12 md:px-24">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">
            여행 정보를 공유하는 공간
            <br />
            Journey Connect
          </h1>
        </div>

        <Link
          to="/login"
          className="px-8 py-4 text-base md:text-lg font-bold text-white bg-blue-600 rounded-xl shadow-xl hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
        >
          시작하기
        </Link>
      </div>
    </div>
  );
}
