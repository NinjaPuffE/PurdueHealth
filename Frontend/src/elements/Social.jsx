import React, { useState, useEffect } from 'react';
import './Social.css';

const Social = ({ userId, token }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] });
  const [mealGroups, setMealGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);

  // Fetch friends and meal groups
  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        const [friendsResponse, groupsResponse, requestsResponse] = await Promise.all([
          fetch(`https://purduehealth.onrender.com/api/social/friends/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://purduehealth.onrender.com/api/social/groups/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://purduehealth.onrender.com/api/social/friend-requests/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const [friendsData, groupsData, requestsData] = await Promise.all([
          friendsResponse.json(),
          groupsResponse.json(),
          requestsResponse.json()
        ]);

        setFriends(friendsData);
        setMealGroups(groupsData);
        setFriendRequests(requestsData);
      } catch (error) {
        setError('Failed to load social data');
        console.error('Error fetching social data:', error);
      }
    };

    fetchSocialData();
  }, [userId, token]);

  // Search for users
  const searchUsers = async (term) => {
    if (term.length < 2) return;
    setLoading(true);
    try {
      const response = await fetch(`https://purduehealth.onrender.com/api/social/search?term=${term}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setSearchResults(data.users);
    } catch (error) {
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  // Add friend request function
  const sendFriendRequest = async (friendId) => {
    try {
      const response = await fetch('https://purduehealth.onrender.com/api/social/friends/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send friend request');
      }

      const data = await response.json();
      setFriendRequests(prev => ({
        ...prev,
        sent: [...prev.sent, data.requestedFriend]
      }));

      // Show success message
      setError('Friend request sent successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Friend request error:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Accept friend request function
  const acceptFriendRequest = async (friendId) => {
    try {
      const response = await fetch('https://purduehealth.onrender.com/api/social/friends/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
      });

      const data = await response.json();
      setFriends(prev => [...prev, data.friend]);
      setFriendRequests(prev => ({
        ...prev,
        received: prev.received.filter(req => req.email !== friendId)
      }));
    } catch (error) {
      setError('Failed to accept friend request');
    }
  };

  // Add friend
  const addFriend = async (friendId) => {
    try {
      const response = await fetch('https://purduehealth.onrender.com/api/social/friends/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, friendId })
      });
      const data = await response.json();
      setFriends([...friends, data.friend]);
    } catch (error) {
      setError('Failed to add friend');
    }
  };

  // Create meal group
  const createMealGroup = async (groupName) => {
    try {
      const response = await fetch('https://purduehealth.onrender.com/api/social/groups/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: groupName,
          creatorId: userId,
          members: [userId]
        })
      });
      const data = await response.json();
      setMealGroups([...mealGroups, data.group]);
    } catch (error) {
      setError('Failed to create group');
    }
  };

  // Add friend to group function
  const addMemberToGroup = async (groupId, memberIds) => {
    try {
      if (!memberIds.length) return;

      const response = await fetch(`https://purduehealth.onrender.com/api/social/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add members to group');
      }
      
      const data = await response.json();
      setMealGroups(prevGroups => 
        prevGroups.map(group => 
          group._id === groupId ? data.group : group
        )
      );
      setError('Members added successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Add members error:', error);
      setError(error.message);
    } finally {
      setShowAddMembersModal(false);
      setSelectedNewMembers([]);
    }
  };

  // Update create group function
  const createGroup = async () => {
    try {
      const response = await fetch('https://purduehealth.onrender.com/api/social/groups/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: newGroupName,
          creator: userId,
          members: [userId, ...selectedGroupMembers]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const data = await response.json();
      setMealGroups(prevGroups => [...prevGroups, data.group]);
      setShowGroupModal(false);
      setNewGroupName('');
      setSelectedGroupMembers([]);
      setError('Group created successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Group creation error:', error);
      setError('Failed to create group');
    }
  };

  // Add GroupModal component
  const GroupModal = () => (
    <div className="modal" onClick={() => setShowGroupModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Create New Group</h2>
        <input
          type="text"
          placeholder="Enter group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          autoFocus
        />
        <div className="friend-selector">
          <h3>Select Members</h3>
          <div className="friend-select-header">
            <label>
              <input
                type="checkbox"
                checked={selectedGroupMembers.length === friends.length}
                onChange={() => {
                  if (selectedGroupMembers.length === friends.length) {
                    setSelectedGroupMembers([]);
                  } else {
                    setSelectedGroupMembers(friends.map(f => f.email));
                  }
                }}
              />
              Select All
            </label>
          </div>
          {friends.map(friend => (
            <div key={friend.email} className="friend-select-item">
              <input
                type="checkbox"
                id={`friend-${friend.email}`}
                checked={selectedGroupMembers.includes(friend.email)}
                onChange={() => {
                  setSelectedGroupMembers(prev => 
                    prev.includes(friend.email)
                      ? prev.filter(email => email !== friend.email)
                      : [...prev, friend.email]
                  );
                }}
              />
              <label htmlFor={`friend-${friend.email}`}>
                {friend.name || friend.email}
              </label>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button 
            onClick={createGroup}
            disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
          >
            Create Group
          </button>
          <button onClick={() => setShowGroupModal(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  // Add AddMembersModal component
  const AddMembersModal = ({ group }) => (
    <div className="modal" onClick={() => setShowAddMembersModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Add Members to {group.name}</h2>
        <div className="friend-selector">
          <h3>Select Members to Add</h3>
          <div className="friend-select-header">
            <label>
              <input
                type="checkbox"
                checked={
                  selectedNewMembers.length === 
                  friends.filter(f => !group.members.includes(f.email)).length
                }
                onChange={() => {
                  const availableFriends = friends
                    .filter(f => !group.members.includes(f.email))
                    .map(f => f.email);
                  if (selectedNewMembers.length === availableFriends.length) {
                    setSelectedNewMembers([]);
                  } else {
                    setSelectedNewMembers(availableFriends);
                  }
                }}
              />
              Select All
            </label>
          </div>
          {friends
            .filter(friend => !group.members.includes(friend.email))
            .map(friend => (
              <div key={friend.email} className="friend-select-item">
                <input
                  type="checkbox"
                  id={`new-member-${friend.email}`}
                  checked={selectedNewMembers.includes(friend.email)}
                  onChange={() => {
                    setSelectedNewMembers(prev => 
                      prev.includes(friend.email)
                        ? prev.filter(email => email !== friend.email)
                        : [...prev, friend.email]
                    );
                  }}
                />
                <label htmlFor={`new-member-${friend.email}`}>
                  {friend.name || friend.email}
                </label>
              </div>
            ))}
        </div>
        <div className="modal-actions">
          <button 
            onClick={() => {
              addMemberToGroup(group._id, selectedNewMembers);
            }}
            disabled={selectedNewMembers.length === 0}
          >
            Add Selected Members
          </button>
          <button onClick={() => setShowAddMembersModal(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="social-container">
      {error && (
        <div className={error.includes('success') ? 'success-message' : 'error-message'}>
          {error}
        </div>
      )}
      <div className="search-section">
        <h2>Find Friends</h2>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            searchUsers(e.target.value);
          }}
        />
        {loading && <div className="loading">Searching...</div>}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(user => (
              <div key={user.email} className="user-card">
                <div className="user-info">
                  <h3>{user.username || user.email}</h3>
                  <p>{user.email}</p>
                </div>
                <button 
                  onClick={() => sendFriendRequest(user.email)}
                  className="friend-request-btn"
                >
                  Send Friend Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="friend-requests-section">
        <h2>Friend Requests</h2>
        
        {/* Received Requests */}
        <h3>Received Requests</h3>
        {friendRequests.received?.length > 0 ? (
          <div className="requests-list">
            {friendRequests.received.map(request => (
              <div key={request.email} className="request-card">
                <div className="user-info">
                  <h3>{request.username || request.email}</h3>
                  <p>{request.email}</p>
                </div>
                <button onClick={() => acceptFriendRequest(request.email)}>
                  Accept Request
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No pending requests</p>
        )}

        {/* Sent Requests */}
        <h3>Sent Requests</h3>
        {friendRequests.sent?.length > 0 ? (
          <div className="requests-list">
            {friendRequests.sent.map(request => (
              <div key={request.email} className="request-card">
                <div className="user-info">
                  <h3>{request.username || request.email}</h3>
                  <p>{request.email}</p>
                </div>
                <span className="pending-status">Pending</span>
              </div>
            ))}
          </div>
        ) : (
          <p>No sent requests</p>
        )}
      </div>

      <div className="friends-section">
        <h2>Friends</h2>
        {friends.length > 0 ? (
          <div className="friends-list">
            {friends.map(friend => (
              <div key={friend._id} className="friend-card">
                <img src={friend.picture} alt={friend.name} />
                <div className="friend-info">
                  <h3>{friend.name}</h3>
                  <p>{friend.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No friends added yet</p>
        )}
      </div>

      <div className="groups-section">
        <h2>Groups</h2>
        <button onClick={() => setShowGroupModal(true)}>Create New Group</button>
        
        {showGroupModal && <GroupModal />}
        
        {mealGroups?.length > 0 ? (
          <div className="groups-list">
            {mealGroups.map(group => (
              <div key={group._id} className="group-card">
                <h3>{group.name || 'Unnamed Group'}</h3>
                <p>{group.members?.length || 0} members</p>
                <div className="group-members">
                  {group.members?.map(member => (
                    <span key={member} className="member-tag">
                      {member}
                    </span>
                  ))}
                </div>
                {group.creator === userId && (
                  <div className="group-actions">
                    <button 
                      onClick={() => {
                        setActiveGroupId(group._id);
                        setShowAddMembersModal(true);
                      }}
                      className="add-members-btn"
                    >
                      Add Members
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No groups yet</p>
        )}
      </div>

      {showAddMembersModal && activeGroupId && (
        <AddMembersModal 
          group={mealGroups.find(g => g._id === activeGroupId)} 
        />
      )}
    </div>
  );
};

export default Social;