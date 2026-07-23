import { useNavigate } from "react-router-dom";

// 게시글 카드 컴포넌트: 수정 및 삭제 액션을 연결한다.
function PostCard({ post, setPosts }) {

    const navigate = useNavigate();


    const handleEdit = () => {

        navigate(`/write/${post.id}`);

    };


    const handleDelete = () => {

        const result = window.confirm("정말 삭제하시겠습니까?");

        if (!result) return;


        const savedPosts =
            JSON.parse(localStorage.getItem("posts")) || [];


        const updatedPosts =
            savedPosts.filter(item => item.id !== post.id);


        localStorage.setItem(
            "posts",
            JSON.stringify(updatedPosts)
        );


        setPosts(updatedPosts);

    };


    return (

        <div
            onClick={() => navigate(`/post/${post.id}`)}
            className="
                bg-card
                rounded-xl
                shadow-md
                p-6
                hover:shadow-xl
                transition
                cursor-pointer
            "
        >


            <h2 className="
                text-2xl
                font-bold
                text-title
            ">

                {post.title}

            </h2>



            {post.image && (

                <img
                    src={post.image}
                    alt="travel"
                    className="
                        w-full
                        h-60
                        object-cover
                        rounded-xl
                        mt-4
                    "
                />

            )}



            <p className="
                text-primary
                mt-3
                font-medium
            ">

                📍 {post.location}

            </p>



            <p className="
                text-muted
                mt-2
            ">

                📅 {post.startDate} ~ {post.endDate}

            </p>



            <p className="
                mt-5
                text-text
                leading-relaxed
            ">

                {post.content}

            </p>



            <div className="
                flex
                gap-3
                mt-6
            ">



                <button

                    onClick={(e) => {
                        e.stopPropagation();
                        handleEdit();
                    }}

                    className="
                        bg-primary
                        hover:bg-primaryHover
                        text-white
                        px-5
                        py-2
                        rounded-lg
                    "

                >

                    수정

                </button>




                <button

                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                    }}

                    className="
                        bg-red-500
                        hover:bg-red-600
                        text-white
                        px-5
                        py-2
                        rounded-lg
                    "

                >

                    삭제

                </button>


            </div>


        </div>

    );

}


export default PostCard;