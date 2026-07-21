import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function PostDetail() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);


  useEffect(() => {

    const posts =
      JSON.parse(localStorage.getItem("posts")) || [];

    const findPost = posts.find(
      (post) => post.id === Number(id)
    );

    setPost(findPost);

  }, [id]);


  // 삭제
  const handleDelete = () => {

    const posts =
      JSON.parse(localStorage.getItem("posts")) || [];

    const filteredPosts =
      posts.filter(
        (post) => post.id !== Number(id)
      );

    localStorage.setItem(
      "posts",
      JSON.stringify(filteredPosts)
    );

    alert("삭제되었습니다.");

    navigate("/myposts");

  };


  if (!post) {
    return (
      <div>
        게시글을 찾을 수 없습니다.
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-100 p-8">

      <div className="
        max-w-3xl mx-auto
        bg-white
        rounded-xl
        shadow-lg
        p-8
      ">

        <h1 className="text-3xl font-bold mb-4">
          {post.title}
        </h1>

        <p className="text-blue-600 mb-3">
  📍 {post.location}
</p>

        <p className="text-gray-500 mb-6">
  📅 {post.startDate} ~ {post.endDate}
</p>

        {post.image && (
  <img
    src={post.image}
    alt="travel"
    className="
      w-full
      h-80
      object-cover
      rounded-xl
      mb-6
    "
  />
)}


<div className="mb-6">
  {post.content}
</div>


<div className="flex gap-3">

        <button
  onClick={() =>
    navigate(`/write/${post.id}`)
  }
            className="
              bg-blue-500
              text-white
              px-4 py-2
              rounded-lg
            "
          >
            수정
          </button>

          <button
  onClick={() => {
    const result = window.confirm(
      "정말 삭제하시겠습니까?"
    );

    if (result) {
      handleDelete();
    }
  }}
            className="
              bg-red-500
              text-white
              px-4 py-2
              rounded-lg
            "
          >
            삭제
          </button>


        </div>


      </div>

    </div>
  );
}


export default PostDetail;