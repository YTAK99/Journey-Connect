import { useEffect, useMemo, useState } from 'react'
import { Bookmark, ChevronDown, CloudSun, Compass, Heart, MapPin, MessageCircle, Moon, Search, Settings2, Sun, X } from 'lucide-react'
import apiClient from './services/apiClient'
import landingBackground from '../../media/photo-1487253031786-9989fcd7bb73.png'
import './App.css'

const fallbackPosts = [
  { id: 1, location: '일본 · 도쿄', title: '시부야의 밤, 조금 느리게 걷기', tags: ['#도쿄여행', '#시부야'], likes: 238, comments: 19, user: 'mari', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1000&q=85' },
  { id: 2, location: '일본 · 도쿄', title: '아사쿠사에서 시작하는 아침', tags: ['#아사쿠사', '#도쿄맛집'], likes: 164, comments: 12, user: 'doyeon', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1000&q=85' },
  { id: 3, location: '일본 · 도쿄', title: '도쿄에서 찾은 여름의 초록', tags: ['#도쿄카페', '#여름'], likes: 321, comments: 27, user: 'jen', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1000&q=85' },
]
const cities = { 서울: ['Asia/Seoul', '맑음', '27°'], 도쿄: ['Asia/Tokyo', '맑음', '29°'], 파리: ['Europe/Paris', '구름 조금', '22°'], 뉴욕: ['America/New_York', '맑음', '25°'] }
const cityTime = (zone) => new Intl.DateTimeFormat('ko-KR', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
const fallbackAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80'
const fallbackImage = 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85'
const mapPost = (post) => ({ id: post.id, location: post.regionName || '여행지 미정', title: post.title, tags: [], likes: post.likeCount ?? 0, comments: 0, user: post.author?.nickname || '여행자', avatar: post.author?.profileImageUrl || fallbackAvatar, image: post.coverImageUrl || fallbackImage })

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(localStorage.getItem('accessToken')))
  const [page, setPage] = useState('피드')
  const [region, setRegion] = useState('도쿄')
  const [query, setQuery] = useState('')
  const [auth, setAuth] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [lang, setLang] = useState('한국어')
  const [liked, setLiked] = useState(new Set())
  const [saved, setSaved] = useState(new Set())
  const [apiPosts, setApiPosts] = useState([])
  const [apiNotice, setApiNotice] = useState('')
  const [, tick] = useState(0)

  useEffect(() => { const id = setInterval(() => tick((value) => value + 1), 60000); return () => clearInterval(id) }, [])
  useEffect(() => {
    if (!loggedIn) return
    let active = true
    const endpoint = page === '탐색' ? '/explore' : '/feed'
    const params = page === '탐색' ? { keyword: query || undefined, region: region || undefined, size: 20 } : { size: 20 }
    apiClient.get(endpoint, { params }).then(({ data }) => {
      const payload = data?.data
      const items = payload?.content || payload?.items || []
      if (active) { setApiPosts(items.map(mapPost)); setApiNotice('') }
    }).catch(() => { if (active) setApiNotice('백엔드에 연결되면 실제 여행 게시물이 표시됩니다.') })
    return () => { active = false }
  }, [loggedIn, page, query, region])

  const shownPosts = useMemo(() => {
    const source = apiPosts.length ? apiPosts : fallbackPosts
    return source.filter((post) => `${post.title} ${post.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  }, [apiPosts, query])
  const toggle = (set, id) => set((value) => { const next = new Set(value); next.has(id) ? next.delete(id) : next.add(id); return next })
  const interact = async (kind, id) => {
    const set = kind === 'likes' ? setLiked : setSaved
    const values = kind === 'likes' ? liked : saved
    const selected = values.has(id)
    toggle(set, id)
    try { await apiClient({ url: `/posts/${id}/${kind}`, method: selected ? 'delete' : 'post' }) } catch { toggle(set, id) }
  }
  const authenticate = async ({ email, password, nickname }) => {
    const { data } = await apiClient.post(`/auth/${auth === 'signup' ? 'signup' : 'login'}`, auth === 'signup' ? { email, password, nickname } : { email, password })
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    setAuth(null); setLoggedIn(true)
  }

  if (!loggedIn) return <Landing region={region} setRegion={setRegion} auth={auth} setAuth={setAuth} onAuthenticate={authenticate} background={landingBackground} />
  const [zone, weather, temp] = cities[region] || cities.도쿄
  return <div className={dark ? 'app dark' : 'app'}>
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={() => setPage('피드')}><Compass size={20} /><span>Journey-Connect</span></button>
      <nav>{['피드', '탐색', '크루'].map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}>{item}</button>)}</nav>
      <label className="top-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역, 장소, 태그 검색" /></label>
      <div className="profile"><img src={fallbackAvatar} alt="내 프로필" /><button className="setting-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="설정"><Settings2 size={19} /></button>
      {settingsOpen && <div className="settings-popover"><button onClick={() => setLang(lang === '한국어' ? 'English' : '한국어')}>언어 <b>{lang}</b></button><button onClick={() => setDark(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />} 다크 모드 <i className={dark ? 'on' : ''} /></button></div>}</div>
    </div></header>
    <main className="content"><RegionBar region={region} setRegion={setRegion} time={cityTime(zone)} weather={weather} temp={temp} />
      {apiNotice && <p className="api-notice">{apiNotice}</p>}
      {page === '피드' ? <Feed posts={shownPosts} liked={liked} saved={saved} onLike={(id) => interact('likes', id)} onSave={(id) => interact('bookmarks', id)} /> : page === '탐색' ? <Explore posts={shownPosts} region={region} liked={liked} saved={saved} onLike={(id) => interact('likes', id)} onSave={(id) => interact('bookmarks', id)} /> : <Crew />}
    </main>
  </div>
}

function Landing({ region, setRegion, auth, setAuth, onAuthenticate, background }) {
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { setError(''); await onAuthenticate(Object.fromEntries(form)) } catch (err) { setError(err.response?.data?.message || '로그인 정보를 확인하거나 백엔드 연결을 확인해주세요.') } }
  return <div className="landing" style={{ backgroundImage: `linear-gradient(90deg, #ffffffeb 0%, #ffffffbe 43%, #ffffff20 70%), url(${background})` }}>
    <div className="landing-panel"><div className="landing-content"><div className="landing-brand"><Compass size={23} /> Journey-Connect</div><p className="landing-copy">로컬의 시선으로 여행을 발견하고,<br />같은 방향을 향하는 사람들과 만나요.</p><label className="region-search"><Search size={18} /><input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="어디로 떠나시나요?" /></label><div className="auth-buttons"><button className="login" onClick={() => setAuth('login')}>로그인</button><button onClick={() => setAuth('signup')}>회원가입</button></div></div></div>
    {auth && <div className="modal-backdrop"><form className="auth-modal" onSubmit={submit}><button type="button" className="close" onClick={() => setAuth(null)}><X size={19} /></button><p className="kicker">JOURNEY-CONNECT</p><h2>{auth === 'login' ? '다시 만나서 반가워요.' : '새로운 여정을 시작하세요.'}</h2><input required name="email" type="email" placeholder="이메일" /><input required name="password" minLength="8" type="password" placeholder="비밀번호" />{auth === 'signup' && <input required name="nickname" maxLength="40" placeholder="닉네임" />}{error && <p className="auth-error">{error}</p>}<button className="login" type="submit">{auth === 'login' ? '로그인하고 계속하기' : '회원가입하고 시작하기'}</button></form></div>}
  </div>
}

function RegionBar({ region, setRegion, time, weather, temp }) { const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(region); const apply = () => { if (draft.trim()) setRegion(draft.trim()); setEditing(false) }; return <section className="region-bar"><div><p>현재 선택한 지역</p>{editing ? <form className="region-edit" onSubmit={(event) => { event.preventDefault(); apply() }}><MapPin size={18} /><input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="지역 입력" /><button>완료</button></form> : <label><MapPin size={18} /><strong>{region}</strong><button className="region-change" onClick={() => { setDraft(region); setEditing(true) }}>변경</button><ChevronDown size={15} /></label>}</div><span className="bar-line" /><div><p>현지 시간</p><strong>{time}</strong></div><span className="bar-line" /><div><p>현지 날씨</p><strong><CloudSun size={19} /> {weather} <small>{temp}</small></strong></div></section> }
function Feed({ posts, liked, saved, onLike, onSave }) { return <><section className="story-section"><div className="section-title"><h2>최근 여행 이야기</h2><span>새로운 게시물</span></div><div className="stories">{posts.slice(0, 5).map((post) => <div className="story" key={post.id}><img src={post.image} alt="" /><small>{post.location}</small></div>)}</div></section><div className="feed-divider"><span>여행자들의 피드</span></div><section className="feed-list">{posts.map((post) => <FeedCard key={post.id} post={post} liked={liked} saved={saved} onLike={onLike} onSave={onSave} />)}</section></> }
function FeedCard({ post, liked, saved, onLike, onSave }) { return <article className="feed-card"><header><img src={post.avatar} alt="" /><div><b>{post.user}</b><span><MapPin size={12} />{post.location}</span></div><button aria-label="게시물 옵션">•••</button></header><img className="feed-photo" src={post.image} alt={post.title} /><div className="feed-body"><div className="card-actions"><button className={liked.has(post.id) ? 'selected' : ''} onClick={() => onLike(post.id)}><Heart fill={liked.has(post.id) ? 'currentColor' : 'none'} /></button><button><MessageCircle /></button><button className={saved.has(post.id) ? 'selected save' : 'save'} onClick={() => onSave(post.id)}><Bookmark fill={saved.has(post.id) ? 'currentColor' : 'none'} /></button></div><b>좋아요 {post.likes + (liked.has(post.id) ? 1 : 0)}개</b><h3>{post.title}</h3><div className="tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className="comments">댓글 {post.comments}개 모두 보기</button></div></article> }
function Explore({ posts, region, liked, saved, onLike, onSave }) { return <section className="explore"><div className="section-title"><div><p className="kicker">EXPLORE</p><h2>{region}를 더 깊이 발견해보세요</h2></div><span>추천순 · 최신순</span></div><div className="explore-grid">{posts.map((post) => <article className="explore-card" key={post.id}><div className="explore-image"><img src={post.image} alt={post.title} /><span>{post.location}</span><button className={saved.has(post.id) ? 'selected' : ''} onClick={() => onSave(post.id)}><Bookmark fill={saved.has(post.id) ? 'currentColor' : 'none'} /></button></div><div className="explore-body"><h3>{post.title}</h3><div className="tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><footer><button className={liked.has(post.id) ? 'selected' : ''} onClick={() => onLike(post.id)}><Heart fill={liked.has(post.id) ? 'currentColor' : 'none'} /> {post.likes}</button><button><MessageCircle /> {post.comments}</button></footer></div></article>)}</div></section> }
function Crew() { return <section className="empty"><Compass size={32} /><h2>함께 떠날 크루를 찾고 있어요</h2><p>곧 여행 취향이 맞는 사람들을 연결해드릴게요.</p></section> }
