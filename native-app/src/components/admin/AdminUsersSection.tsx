import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ChevronDown, Search } from 'lucide-react-native';

import { ALL_GRADES_FILTER, SUPPORTED_GRADES } from '../../constants/grades';
import { AdminPortalUser } from '../../types/app';

interface AdminUsersSectionProps {
  styles: Record<string, any>;
  userGradeFilter: string;
  userSchoolFilter: string;
  userGradeMenuOpen: boolean;
  userSchoolMenuOpen: boolean;
  userSearch: string;
  users: AdminPortalUser[];
  filteredUsers: AdminPortalUser[];
  onToggleGradeMenu: () => void;
  onToggleSchoolMenu: () => void;
  onSelectGrade: (grade: string) => void;
  onSelectSchool: (school: string) => void;
  onSearchChange: (value: string) => void;
  onSelectUser: (user: AdminPortalUser) => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminUsersSection({
  styles,
  userGradeFilter,
  userSchoolFilter,
  userGradeMenuOpen,
  userSchoolMenuOpen,
  userSearch,
  users,
  filteredUsers,
  onToggleGradeMenu,
  onToggleSchoolMenu,
  onSelectGrade,
  onSelectSchool,
  onSearchChange,
  onSelectUser,
}: AdminUsersSectionProps) {
  const schoolOptions = ['All Schools', ...Array.from(new Set(users.map(user => user.school)))];
  return (
    <>
      <View style={styles.pageHead}>
        <Text style={styles.pageTitle}>Users</Text>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.panel}>
          <Text style={styles.miniLabel}>Visible Users</Text>
          <Text style={styles.panelTitle}>{users.length}</Text>
          <Text style={styles.panelTextSmall}>Live records only</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.miniLabel}>Current Filter Result</Text>
          <Text style={styles.panelTitle}>{filteredUsers.length}</Text>
          <Text style={styles.activeGradeText}>Matching users</Text>
        </View>
      </View>

      <View style={styles.filterCluster}>
        <View style={styles.menuWrap}>
          <Pressable onPress={onToggleGradeMenu} style={styles.chip}>
            <Text style={styles.chipText}>{userGradeFilter}</Text>
            <ChevronDown size={14} color="#94A3B8" />
          </Pressable>
          {userGradeMenuOpen ? (
            <View style={[styles.menu, styles.userMenu]}>
              {[ALL_GRADES_FILTER, ...SUPPORTED_GRADES].map(option => (
                <Pressable
                  key={option}
                  onPress={() => onSelectGrade(option)}
                  style={[styles.menuItem, userGradeFilter === option && styles.menuItemActive]}>
                  <Text style={[styles.menuText, userGradeFilter === option && styles.menuTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.menuWrap}>
          <Pressable onPress={onToggleSchoolMenu} style={styles.chip}>
            <Text style={styles.chipText}>
              {userSchoolFilter.length > 12 ? `${userSchoolFilter.slice(0, 10)}...` : userSchoolFilter}
            </Text>
            <ChevronDown size={14} color="#94A3B8" />
          </Pressable>
          {userSchoolMenuOpen ? (
            <View style={[styles.menu, styles.schoolMenu]}>
              {schoolOptions.map(option => (
                <Pressable
                  key={option}
                  onPress={() => onSelectSchool(option)}
                  style={[styles.menuItem, userSchoolFilter === option && styles.menuItemActive]}>
                  <Text style={[styles.menuText, userSchoolFilter === option && styles.menuTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          value={userSearch}
          onChangeText={onSearchChange}
          placeholder="Search users by name or email..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.listContainer}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, index) => (
            <Pressable
              key={`${user.email}-${user.name}`}
              onPress={() => onSelectUser(user)}
              style={[styles.userRow, index < filteredUsers.length - 1 && styles.userRowDivider]}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(user.name)}</Text>
                </View>
                <View>
                  <Text style={styles.itemTitle}>{user.name}</Text>
                  <Text style={styles.itemMeta}>{`${user.school} • ${user.grade}`}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={[styles.userStatus, user.color === 'green' ? styles.userStatusGreen : styles.userStatusGray]}>
                  {user.status}
                </Text>
                <ChevronDown size={16} color="#D1D5DB" style={styles.chevronRight} />
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No users found. Connect live user data to populate this portal.</Text>
          </View>
        )}
      </View>
    </>
  );
}
