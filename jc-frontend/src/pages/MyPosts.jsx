import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import { getUser } from "../services/auth";

// 사용자가 작성한 게시글 목록을 보여주는 페이지다.
function MyPosts() {

  const [posts, setPosts] = useState([]);

  useEffect(() => {

    const savedPosts =
      JSON.parse(localStorage.getItem("posts")) || [];


      const user = getUser();


      if (!user) {
          setPosts([]);
          return;
      }
      
      
      const myPosts = savedPosts.filter(
          (post) => post.userId === user.id
      );
      
      
      setPosts([...myPosts].reverse());

}, []);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
<h1 className="text-3xl font-bold">
  내가 작성한 글
</h1>

<p className="text-gray-500 mb-8">
  총 {posts.length}개의 게시글
</p>

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