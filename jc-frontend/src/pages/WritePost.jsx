import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUser } from "../services/auth";
import { Camera } from "lucide-react";

// 여행 일정 작성 및 수정 페이지다.
function WritePost() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [image, setImage] = useState("");


    useEffect(() => {

        if (id) {

            const savedPosts =
                JSON.parse(localStorage.getItem("posts")) || [];

            const editPost = savedPosts.find(
                (post) => post.id === Number(id)
            );

            if (editPost) {
                setTitle(editPost.title);
                setContent(editPost.content);
                setLocation(editPost.location);
                setStartDate(editPost.startDate);
                setEndDate(editPost.endDate);
                setImage(editPost.image || "");
            }
        }

    }, [id]);


    const handleImage = (e) => {

        const file = e.target.files[0];

        if(file){

            const reader = new FileReader();

            reader.onload = () => {
                setImage(reader.result);
            };

            reader.readAsDataURL(file);

        }

    };


    const handleSubmit = () => {

        if (!title.trim()) {
            alert("일정 제목을 입력해주세요.");
            return;
        }

        if (!location.trim()) {
            alert("여행 지역을 입력해주세요.");
            return;
        }

        if (!content.trim()) {
            alert("여행 일정을 입력해주세요.");
            return;
        }

        if (!startDate || !endDate) {
            alert("여행 날짜를 선택해주세요.");
            return;
        }

        if (startDate > endDate) {
            alert("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
            return;
        }

        if (!id && !image) {
            alert("여행 사진을 등록해주세요.");
            return;
        }


        const savedPosts =
            JSON.parse(localStorage.getItem("posts")) || [];


        if (id) {

            const updatedPosts = savedPosts.map((post) => {

                if (post.id === Number(id)) {

                    return {
                        ...post,
                        title,
                        content,
                        location,
                        startDate,
                        endDate,
                        image
                    };

                }

                return post;

            });


            localStorage.setItem(
                "posts",
                JSON.stringify(updatedPosts)
            );


            alert("게시글이 수정되었습니다.");

        }


        else {

            const user = getUser();

            if (!user) {

                alert("로그인이 필요합니다.");
                navigate("/login");
                return;

            }


            const newPost = {

                id: Date.now(),

                userId: user.id,

                title,
                content,
                location,
                startDate,
                endDate,
                image

            };


            savedPosts.push(newPost);


            localStorage.setItem(
                "posts",
                JSON.stringify(savedPosts)
            );


            alert("여행 일정이 등록되었습니다.");

        }


        navigate("/myposts");

    };


    return (

        <div className="
            max-w-4xl 
            mx-auto 
            mt-10 
            p-8 
            bg-card 
            rounded-xl 
            shadow-md
        ">


            <h1 className="
                text-3xl 
                font-bold 
                mb-8 
                text-title
            ">
                {id ? "여행 일정 수정" : "여행 일정 작성"}
            </h1>



            <label className="font-semibold text-text">
                일정 제목
            </label>


            <input
                className="
                    w-full
                    border
                    border-gray-200
                    rounded-lg
                    p-3
                    mt-2
                    mb-5
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary
                "
                placeholder="여행 일정 제목을 입력하세요."
                value={title}
                onChange={(e)=>setTitle(e.target.value)}
            />



            <label className="font-semibold text-text">
                여행 지역
            </label>


            <input
                className="
                    w-full
                    border
                    border-gray-200
                    rounded-lg
                    p-3
                    mt-2
                    mb-5
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary
                "
                placeholder="예) 일본 오사카"
                value={location}
                onChange={(e)=>setLocation(e.target.value)}
            />



            <label className="font-semibold text-text">
                여행 시작 날짜
            </label>


            <input
                type="date"
                className="
                    w-full
                    border
                    border-gray-200
                    rounded-lg
                    p-3
                    mt-2
                    mb-5
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary
                "
                value={startDate}
                onChange={(e)=>setStartDate(e.target.value)}
            />



            <label className="font-semibold text-text">
                여행 종료 날짜
            </label>


            <input
                type="date"
                className="
                    w-full
                    border
                    border-gray-200
                    rounded-lg
                    p-3
                    mt-2
                    mb-5
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary
                "
                value={endDate}
                onChange={(e)=>setEndDate(e.target.value)}
            />



            <label className="font-semibold text-text">
                여행 일정
            </label>


            <textarea
                className="
                    w-full
                    h-72
                    border
                    border-gray-200
                    rounded-lg
                    p-3
                    mt-2
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary
                "
                placeholder="여행 일정을 자유롭게 작성해주세요."
                value={content}
                onChange={(e)=>setContent(e.target.value)}
            />



            <label className="font-semibold text-text block mt-5">
                여행 사진
            </label>


            <div className="mt-3 mb-5">

                <label
                    className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        w-40
                        bg-primary
                        hover:bg-primaryHover
                        text-white
                        py-3
                        rounded-xl
                        cursor-pointer
                    "
                >

                    <Camera size={22}/>

                    사진 추가


                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImage}
                    />

                </label>

            </div>



            {image && (

                <img
                    src={image}
                    alt="preview"
                    className="
                        w-64
                        h-40
                        object-cover
                        rounded-xl
                        mb-5
                    "
                />

            )}



            <button

                onClick={handleSubmit}

                className="
                    mt-8
                    w-full
                    bg-primary
                    hover:bg-primaryHover
                    text-white
                    py-3
                    rounded-lg
                "
            >

                {id ? "수정 완료" : "일정 등록하기"}

            </button>


        </div>

    );

}


export default WritePost;