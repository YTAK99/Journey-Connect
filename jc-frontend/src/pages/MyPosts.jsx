import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";

function MyPosts() {

  const [posts, setPosts] = useState([]);

  useEffect(() => {

    const savedPosts =
      JSON.parse(localStorage.getItem("posts")) || [];

    setPosts(savedPosts);

  }, []);


  return (
    <div className="min-h-screen bg-slate-100 p-8">

      <h1 className="text-3xl font-bold mb-8">
        내가 작성한 글
      </h1>


      {posts.length === 0 ? (

        <p>작성한 글이 없습니다.</p>

      ) : (

        <div className="space-y-5">

          {posts.map((post) => (

<PostCard
key={post.id}
post={post}
setPosts={setPosts}
/>

          ))}

        </div>

      )}

    </div>
  );
}

export default MyPosts;