import {useState} from "react";
import {useNavigate} from "react-router";
import useTranslation from "../i18n/useTranslation";

const HomeSearchBar = () => {
    const [keyword, setKeyword] = useState('');
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                placeholder={t("search.homePlaceholder")}/>
        </form>
    );
}
export default HomeSearchBar;
