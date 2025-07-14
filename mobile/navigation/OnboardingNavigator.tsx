import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ProblemScreen from '../screens/onboarding/ProblemScreen';
import SolutionScreen from '../screens/onboarding/SolutionScreen';
import DemoScreen from '../screens/onboarding/DemoScreen';
import AccountSetupScreen from '../screens/onboarding/AccountSetupScreen';
import HouseholdSetupScreen from '../screens/onboarding/HouseholdSetupScreen';
import PermissionsScreen from '../screens/onboarding/PermissionsScreen';

const Stack = createNativeStackNavigator();

export type OnboardingStackParamList = {
  Welcome: undefined;
  Problem: undefined;
  Solution: undefined;
  Demo: undefined;
  AccountSetup: undefined;
  HouseholdSetup: undefined;
  Permissions: undefined;
};

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable swipe back to ensure users follow the flow
        animation: 'slide_from_right',
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen 
        name="Problem" 
        component={ProblemScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="Solution" 
        component={SolutionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="Demo" 
        component={DemoScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="AccountSetup" 
        component={AccountSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="HouseholdSetup" 
        component={HouseholdSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="Permissions" 
        component={PermissionsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
} 