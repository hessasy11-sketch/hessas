import { useState } from 'react';
import { ArrowRight, Users, Search, UserPlus, UserMinus, MessageCircle, Eye, User } from 'lucide-react';
import { useFollowers } from '../hooks/useFollowers';
import type { UserProfile, FollowSuggestion } from '../hooks/useFollowers';

interface FollowersViewProps {
  onBack: () => void;
}

type TabType = 'following' | 'followers';

export function FollowersView({ onBack }: FollowersViewProps) {
  const {
    following,
    followers,
    suggestions,
    loading,
    toggleFollow,
    isFollowing,
    searchUsers,
    followingCount,
    followersCount
  } = useFollowers();

  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const results = await searchUsers(query);
    setSearchResults(results);
    setSearching(false);
  };

  const handleToggleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingUserId(userId);
    await toggleFollow(userId);
    setProcessingUserId(null);
  };

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent('مرحباً، تواصلت معك من خلال منصة حصص زراعية للاستثمار 🌾');
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const UserCard = ({ user, showFollowButton = true }: { user: UserProfile; showFollowButton?: boolean }) => {
    const isProcessing = processingUserId === user.id;
    const following = isFollowing(user.id);

    return (
      <div className="bg-white border-2 border-gray-100 hover:border-green-200 rounded-2xl p-4 transition-all hover:shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
            {user.display_name?.charAt(0) || <User className="w-7 h-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-lg truncate">
              {user.display_name || 'مستخدم'}
            </h3>
            <div className="text-sm text-gray-500 mt-1">
              {user.phone_number}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-600 mb-1">متابعون</div>
            <div className="text-lg font-bold text-green-700">{user.followers_count || 0}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-600 mb-1">يتابع</div>
            <div className="text-lg font-bold text-blue-700">{user.following_count || 0}</div>
          </div>
        </div>

        <div className="flex gap-2">
          {showFollowButton && (
            <button
              onClick={(e) => handleToggleFollow(user.id, e)}
              disabled={isProcessing}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1 ${
                following
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : following ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  إلغاء المتابعة
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  متابعة
                </>
              )}
            </button>
          )}
          <button
            onClick={(e) => handleWhatsApp(user.phone_number, e)}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all"
            title="مراسلة عبر واتساب"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all"
            title="عرض الحساب"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const SuggestionCard = ({ suggestion }: { suggestion: FollowSuggestion }) => {
    const isProcessing = processingUserId === suggestion.id;
    const following = isFollowing(suggestion.id);

    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 transition-all hover:shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
            {suggestion.display_name?.charAt(0) || <User className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 truncate">
              {suggestion.display_name || 'مستخدم'}
            </h4>
            {suggestion.common_interests > 0 && (
              <div className="text-xs text-green-600 mt-1">
                {suggestion.common_interests} اهتمام مشترك
              </div>
            )}
          </div>
        </div>

        <button
          onClick={(e) => handleToggleFollow(suggestion.id, e)}
          disabled={isProcessing || following}
          className={`w-full py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1 ${
            following
              ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : following ? (
            <>
              <UserMinus className="w-4 h-4" />
              تمت المتابعة ✅
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              متابعة
            </>
          )}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحميل المتابعين...</p>
        </div>
      </div>
    );
  }

  const displayList = searchQuery
    ? searchResults
    : activeTab === 'following'
    ? following
    : followers;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50" dir="rtl">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              متابعيني الزراعيين
            </h2>
            <p className="text-sm text-white/90 mt-1">
              تتابع {followingCount} مستخدمًا – ويتابعك {followersCount} مستخدمًا
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="ابحث باسم أو رقم العضو الزراعي..."
            className="w-full pr-10 pl-4 py-3 rounded-xl border-2 border-white/30 bg-white/90 focus:bg-white focus:outline-none focus:border-white transition-all"
          />
          {searching && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        {!searchQuery && (
          <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-md border-2 border-gray-100">
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'following'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              أتابعهم ({followingCount})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'followers'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              يتابعونني ({followersCount})
            </button>
          </div>
        )}

        {displayList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-gray-100">
            <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">
              {searchQuery
                ? 'لم يتم العثور على نتائج'
                : activeTab === 'following'
                ? 'لم تتابع أي مستخدم بعد'
                : 'لا يتابعك أحد حتى الآن'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayList.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                showFollowButton={activeTab === 'following' || searchQuery !== ''}
              />
            ))}
          </div>
        )}

        {!searchQuery && suggestions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 p-6 mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🌿 اقتراحات لمتابعة جديدة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
