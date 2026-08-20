import { ArrowLeft, Heart, Newspaper, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';

export function PublicUserProfilePage() {
  const { code } = useParams();
  const [profile, setProfile] = useState(null); const [stats, setStats] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([apiRequest(`/utilisateurs/${code}`), apiRequest(`/utilisateurs/${code}/statistiques`)])
      .then(([user, social]) => { setProfile(user.donnees); setStats(social.donnees); })
      .catch((err) => setError(err.message));
  }, [code]);
  if (error) return <div className="public-user-profile app-panel"><div className="alert alert--error">{error}</div><Link to="/relations"><ArrowLeft />Relations</Link></div>;
  if (!profile) return <div className="content-loading app-panel"><Spinner />Chargement du profil…</div>;
  const initials = profile.nom_affichage.split(' ').map((word) => word[0]).slice(0,2).join('');
  return <section className="public-user-profile app-panel"><Link to="/relations"><ArrowLeft />Retour aux relations</Link><header><span>{profile.url_photo_profil ? <img src={profile.url_photo_profil} alt="" /> : initials}</span><div><small>{profile.role}</small><h1>{profile.nom_affichage}</h1><p>{profile.biographie || 'Membre de la communauté CampusHub.'}</p><em>{[profile.ville, profile.province].filter(Boolean).join(', ')}</em></div></header><div className="public-user-profile__stats"><article><Users /><strong>{stats?.nombre_abonnes || 0}</strong><span>Abonnés</span></article><article><UserRound /><strong>{stats?.nombre_suivis || 0}</strong><span>Suivis</span></article><article><Heart /><strong>{stats?.nombre_jaime || 0}</strong><span>J’aime reçus</span></article><article><Newspaper /><strong>{stats?.nombre_republications || 0}</strong><span>Republications</span></article></div></section>;
}
