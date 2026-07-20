import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function WritePost() {

    const { id } = useParams();
    const navigate = useNavigate();


    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [image, setImage] = useState("");

    // 수정 페이지일 경우 기존 데이터 불러오기
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
    // 등록 / 수정 버튼
    const handleSubmit = () => {

        const savedPosts =
            JSON.parse(localStorage.getItem("posts")) || [];


        // 수정
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


        // 새 글 작성
        else {

            const newPost = {

                id: Date.now(),
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

        <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">


            <h1 className="text-3xl font-bold mb-8">

                여행 일정 작성

            </h1>



            <label className="font-semibold">
                일정 제목
            </label>

            <input

                className="w-full border rounded-lg p-3 mt-2 mb-5"

                placeholder="여행 일정 제목을 입력하세요."

                value={title}

                onChange={(e) => setTitle(e.target.value)}

            />



            <label className="font-semibold">
                여행 지역
            </label>

            <input

                className="w-full border rounded-lg p-3 mt-2 mb-5"

                placeholder="예) 일본 오사카"

                value={location}

                onChange={(e) => setLocation(e.target.value)}

            />



            <label className="font-semibold">
                여행 시작 날짜
            </label>

            <input

                type="date"

                className="w-full border rounded-lg p-3 mt-2 mb-5"

                value={startDate}

                onChange={(e) => setStartDate(e.target.value)}

            />



            <label className="font-semibold">
                여행 종료 날짜
            </label>

            <input

                type="date"

                className="w-full border rounded-lg p-3 mt-2 mb-5"

                value={endDate}

                onChange={(e) => setEndDate(e.target.value)}

            />



            <label className="font-semibold">
                여행 일정
            </label>

            <textarea

                className="w-full h-72 border rounded-lg p-3 mt-2"

                placeholder="여행 일정을 자유롭게 작성해주세요."

                value={content}

                onChange={(e) => setContent(e.target.value)}

            />

<label className="font-semibold block mt-5">
    여행 사진
</label>

<input

    type="file"

    accept="image/*"

    className="mt-2 mb-5"

    onChange={handleImage}

/>


{image && (

    <img

        src={image}

        alt="preview"

        className="w-64 h-40 object-cover rounded-xl mb-5"

    />

)}

            <button

                onClick={handleSubmit}

                className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"

            >

                {id ? "수정 완료" : "일정 등록하기"}

            </button>


        </div>

    );

}


export default WritePost;