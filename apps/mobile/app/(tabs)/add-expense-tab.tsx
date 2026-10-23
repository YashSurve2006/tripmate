import React from 'react';
import { Redirect } from 'expo-router';

export default function AddExpenseTabPlaceholder() {
  return <Redirect href="/add-expense" />;
}
