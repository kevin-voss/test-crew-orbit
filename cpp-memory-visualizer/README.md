# C++ Stack & Heap Memory Visualizer

A beginner-friendly interactive visualization tool to understand how C++ manages memory during step-by-step code execution.

## Overview

This educational app helps beginners understand:
- **Stack memory**: Where local variables and function parameters are stored
- **Heap memory**: Where dynamically allocated memory lives
- **Pointers**: How they store addresses and reference other data
- **Memory addresses**: Where variables and data actually live
- **Dereferencing**: Accessing data through pointers

## Features

✅ **Visual Code Display**
- Shows the C++ code snippet being executed
- Highlights the current line being executed

✅ **Step-by-Step Navigation**
- Forward button to advance to the next execution step
- Backward button to return to the previous step
- Keyboard support (← and → arrow keys)
- Step counter

✅ **Stack Visualization**
- Shows all local variables in scope
- Displays variable names, values, and memory addresses
- Indicates which variables are pointers

✅ **Heap Visualization**
- Shows dynamically allocated memory
- Displays values and their heap addresses
- Highlights what's being managed with `new` and `delete`

✅ **Pointer Relationships**
- Shows which pointers exist
- Displays what each pointer points to
- Shows the address the pointer contains
- Identifies dangling pointers

✅ **Beginner-Friendly Explanations**
- Each step includes a detailed explanation
- Uses simple language to describe what's happening
- Highlights important C++ concepts (address-of operator, dereference, etc.)

## How to Use

1. **Open the app**: Open `index.html` in a web browser
2. **View the code**: The C++ code snippet is displayed at the top
3. **Navigate steps**:
   - Click **"Next Step →"** to advance
   - Click **"Previous Step ←"** to go back
   - Or use the left/right arrow keys on your keyboard
4. **Observe memory changes**:
   - Watch the Stack section to see local variables
   - Watch the Heap section to see dynamically allocated memory
   - Check Pointer Relationships to understand pointer mechanics
5. **Read explanations**: Each step explains what's happening in beginner-friendly terms

## Example Code

The app visualizes this C++ program:

```cpp
int main() {
    int x = 5;              // Line 2
    int* ptr = &x;          // Line 3
    int* ptrHeap = new int(10);  // Line 4
    *ptr = 20;              // Line 5
    delete ptrHeap;         // Line 6
    return 0;               // Line 7
}
```

### What You'll Learn

**Step 1**: Function starts
- The main() function begins execution
- Stack is initially empty

**Step 2**: Variable declaration
- `int x = 5` creates a variable on the stack
- See its address and value

**Step 3**: Pointer creation
- `int* ptr = &x` creates a pointer to x
- The pointer stores x's memory address
- Learn about the address-of operator (&)

**Step 4**: Heap allocation
- `new int(10)` allocates memory on the heap
- `ptrHeap` stores the heap address
- Understand the difference between stack and heap

**Step 5**: Dereferencing
- `*ptr = 20` changes x through the pointer
- See how the dereference operator (*) works
- The variable changes from 5 to 20

**Step 6**: Memory deallocation
- `delete ptrHeap` frees heap memory
- Learn about dangling pointers
- Understand the importance of cleanup

**Step 7**: Function ends
- Stack variables are automatically destroyed
- Recap of stack vs heap behavior

## Files

- `index.html` - Structure and layout
- `style.css` - Styling and responsive design
- `script.js` - Visualization logic and state management
- `README.md` - This file

## Technical Details

- **Pure HTML/CSS/JavaScript**: No external dependencies
- **Responsive Design**: Works on desktop and tablet
- **Keyboard Navigation**: Use arrow keys to navigate steps
- **Animated Updates**: Smooth transitions when memory changes

## Learning Outcomes

After using this visualizer, beginners will understand:

1. How local variables are stored on the stack
2. How pointers work and what memory addresses mean
3. The difference between stack and heap memory
4. How dynamic memory allocation (`new`) works
5. Why dangling pointers are dangerous
6. The importance of freeing memory with `delete`
7. Basic memory management best practices

## Browser Compatibility

Works in all modern browsers:
- Chrome/Chromium
- Firefox
- Safari
- Edge

## Tips for Educators

- Use this in classroom settings to explain memory management
- Step through slowly and discuss each step
- Pause at pointer creation to emphasize the address concept
- Highlight the difference between stack and heap allocation
- Use the dangling pointer example to teach about memory safety

## Future Enhancements

Possible additions:
- Multiple example code snippets
- Custom code input (JavaScript variant)
- Memory address animation
- 3D stack visualization
- Call stack visualization for multiple functions
- Struct and array visualization

---

**Last Updated**: 2026-05-17
**Version**: 1.0
