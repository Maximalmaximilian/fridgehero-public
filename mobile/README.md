# FridgeHero Mobile App

A React Native application that demonstrates full-stack mobile development skills, featuring food inventory management with real-time database synchronization, barcode scanning, and recipe suggestions.

## 🚀 Technical Features

### **Core Functionality**
- **User Authentication**: Complete email/password authentication with session management
- **Barcode Scanner**: Real-time product lookup using device camera and Open Food Facts API
- **Inventory Management**: Full CRUD operations for food items with categorization
- **Expiration Tracking**: Automated status calculations with color-coded visual indicators
- **Recipe Engine**: Smart recipe suggestions based on available ingredients
- **Household System**: Multi-user household creation and management
- **Real-time Updates**: Live data synchronization across users

### **UI/UX Implementation**
- Custom design system with semantic color theming
- Intuitive navigation using React Navigation stack
- Pull-to-refresh functionality with loading states
- Comprehensive error handling and user feedback
- Empty states with helpful guidance
- Responsive design for various screen sizes

### **Visual Status System**
- 🟢 **Fresh**: 3+ days remaining
- 🟡 **Expires Soon**: 1-3 days remaining
- 🟠 **Expires Tomorrow**: <1 day remaining
- 🔴 **Expired**: Past expiration date

## 📱 Application Architecture

### **Screen Structure**
1. **LoginScreen**: Authentication flow with form validation
2. **DashboardScreen**: Main inventory view with real-time updates
3. **AddItemScreen**: Barcode scanning + manual entry with category selection
4. **RecipesScreen**: Dynamic recipe suggestions based on expiring items
5. **ItemsScreen**: Complete inventory management with filtering
6. **ItemDetailsScreen**: Full item editing capabilities
7. **HouseholdsScreen**: Multi-user household management
8. **SettingsScreen**: User preferences and account management

### **Context Management**
- **AuthContext**: User authentication state and session management
- **HouseholdContext**: Household data and member management
- **NotificationContext**: Push notification handling
- **ThemeContext**: App-wide styling and theming

## 🛠️ Technical Stack

- **Framework**: React Native 0.79.2 with Expo SDK 53
- **Language**: TypeScript 5.8.3 for type safety
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth with JWT tokens
- **Navigation**: React Navigation 7.x with stack and tab navigation
- **External APIs**: Open Food Facts (barcode lookup), Recipe databases
- **State Management**: React Context API with custom hooks
- **Camera**: Expo Camera and Barcode Scanner modules
- **Notifications**: Expo Notifications (infrastructure ready)

## 📦 Installation & Setup

### **Prerequisites**
- Node.js 18+
- npm or pnpm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Emulator

### **Development Setup**

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment configuration**:
   Create `.env` file in the mobile directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database setup**:
   ```bash
   npm run supabase:start
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

5. **Run on device/simulator**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🗄️ Database Schema

### **Key Tables**
- **profiles**: Extended user profiles with preferences
- **households**: Household groups with settings
- **household_members**: User-household relationships
- **items**: Food inventory with expiration tracking
- **barcode_cache**: Product information caching
- **recipes**: Recipe database with ingredient matching
- **notifications**: Push notification management

### **Security Implementation**
- Row Level Security (RLS) policies for data protection
- JWT token-based authentication
- User-scoped data access controls
- Secure API endpoint protection

## 🔧 Key Technical Implementations

### **Barcode Scanning System**
- **Camera Integration**: Expo Camera with barcode detection
- **API Integration**: Open Food Facts product lookup
- **Caching Strategy**: Local storage for offline access
- **Error Handling**: Graceful fallbacks to manual entry

### **Recipe Matching Algorithm**
- **Ingredient Analysis**: Keyword matching with fuzzy search
- **Expiration Priority**: Prioritizes items expiring soon
- **Scoring System**: Ranks recipes by ingredient availability
- **Dynamic Updates**: Real-time recipe suggestions

### **Real-time Data Synchronization**
- **Supabase Subscriptions**: Live database updates
- **Optimistic Updates**: Immediate UI feedback
- **Conflict Resolution**: Data consistency handling
- **Offline Support**: Local caching with sync

### **Performance Optimizations**
- **FlatList Optimization**: Efficient list rendering
- **Image Caching**: Optimized image loading
- **Bundle Splitting**: Code splitting for faster loads
- **Memory Management**: Efficient state cleanup

## 🎨 Design System

### **Color System**
- Primary: `#059669` (FridgeHero Green)
- Secondary: `#047857` (Dark Green)
- Status Colors: Semantic expiration indicators
- Neutral Palette: Consistent grays and whites

### **Component Architecture**
- **Reusable Components**: Modular UI building blocks
- **Consistent Spacing**: 8px grid system
- **Typography Scale**: Hierarchical text sizing
- **Accessibility**: WCAG compliance considerations

## 🧪 Testing & Quality

### **Code Quality**
- **TypeScript**: Full type coverage
- **ESLint**: Consistent code style
- **Error Boundaries**: Comprehensive error handling
- **Input Validation**: Form validation and sanitization

### **Performance Monitoring**
- **Bundle Analysis**: Optimized build sizes
- **Memory Usage**: Efficient resource management
- **Network Requests**: Optimized API calls
- **User Experience**: Smooth 60fps animations

## 🔐 Security Features

- **Authentication**: Secure session management
- **Data Validation**: Input sanitization
- **API Security**: Protected endpoints
- **Privacy**: User data protection

## 📊 Skills Demonstrated

### **Mobile Development**
- React Native cross-platform development
- Native module integration (Camera, Notifications)
- Performance optimization techniques
- Mobile-first responsive design

### **Backend Integration**
- Real-time database synchronization
- Authentication and authorization
- API design and integration
- Data modeling and relationships

### **Modern Development Practices**
- TypeScript for type safety
- Component-based architecture
- Context API state management
- Clean code principles

---

**Built with React Native + Expo • Supabase • TypeScript**  
*Demonstrating modern mobile development skills* 