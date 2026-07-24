import {useState} from "react";
import {useNavigate} from "react-router-dom";

const HomeSearchBar = () => {
    const [keyword, setKeyword] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (keyword.trim() === '') return;
        navigate(`/search?q=${keyword}`);
    };

    return (
        <form onSubmit={handleSearch}>
            <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="오늘은 어디로 갈까요?"/>
        </form>
    );
}
export default HomeSearchBar;