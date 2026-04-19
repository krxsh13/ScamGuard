# Accessibility Audit Guide for ScamGuard Frontend

## Overview
This document provides a comprehensive accessibility checklist for all ScamGuard frontend components. It follows WCAG 2.1 Level AA standards.

## General Accessibility Standards

### 1. Keyboard Navigation
Every interactive element must be accessible via keyboard:
- `Tab` - Move to next interactive element
- `Shift+Tab` - Move to previous element
- `Enter` - Activate buttons/links
- `Space` - Activate buttons/toggle checkboxes
- `Arrow Keys` - Navigate within groups (radio buttons, menu items)

### 2. Focus Indicators
- Always visible (minimum 2px outline or equivalent)
- Use `focus:ring-2 focus:ring-offset-2 focus:ring-blue-500` in Tailwind
- Never use `outline: none` without replacing with custom focus style

### 3. Color Contrast (WCAG AA)
- Normal text: 4.5:1
- Large text (18pt+): 3:1
- UI components and borders: 3:1
- Check with: WebAIM, Stark, or built-in browser tools

### 4. Semantic HTML
- Use correct HTML elements (button, link, heading, label, etc.)
- Use heading hierarchy (h1 > h2 > h3, no skipping)
- Use `<label>` with `htmlFor` for form inputs

## Component Audit Checklist

### Header.tsx ✅ ALREADY DONE
**Accessibility Features Implemented**:
- ✓ Logo has accessible name
- ✓ Navigation links have aria-label
- ✓ Active link has aria-current="page"
- ✓ Mobile menu button has aria-label and aria-expanded
- ✓ Focus indicators visible on all interactive elements
- ✓ Menu closes on outside click (better UX)
- ✓ Keyboard accessible

**Verification**: Already meets WCAG AA standards

---

### Hero.tsx - TODO
**Checklist**:
- [ ] Hero heading (h1) is present and descriptive
- [ ] All buttons have accessible names (text or aria-label)
- [ ] Links describe destination or action
- [ ] Focus indicators visible on CTA buttons
- [ ] Image alt text provided (if any)
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Avoid keyboard traps
- [ ] Test: Tab through all elements should work

**Example Fixes**:
```tsx
// BEFORE - Missing accessible name
<button onClick={handleClick}>→</button>

// AFTER - Clear accessible name
<button 
  onClick={handleClick}
  aria-label="Get started with scam detection"
  className="focus:ring-2 focus:ring-blue-500"
>
  Get Started →
</button>
```

---

### ScamChecker.tsx ✅ ALREADY DONE
**Accessibility Features Implemented**:
- ✓ Input labels linked with htmlFor/id
- ✓ Textarea has aria-describedby pointing to results region
- ✓ Results region has role="region", aria-live="polite", aria-label
- ✓ Error messages have role="alert"
- ✓ Buttons have aria-label for icons
- ✓ Fieldset/legend for radio buttons
- ✓ Loading state has role="status"
- ✓ Focus indicators on all buttons

**Verification**: Already meets WCAG AA standards

---

### Education.tsx - TODO
**Checklist**:
- [ ] Main heading (h1) describes page content
- [ ] Subheadings use correct hierarchy (h2, h3, no skips)
- [ ] All buttons/links have accessible names
- [ ] Images have meaningful alt text
- [ ] Code blocks: If displaying code, consider aria-label or role="region"
- [ ] Links to external resources use `aria-label` to indicate external
- [ ] Focus visible on interactive elements
- [ ] Color contrast ≥ 4.5:1 for all text
- [ ] Tables (if any): Have proper thead, tbody, th elements

**Example Implementation**:
```tsx
// Good heading structure
<h1>Educational Resources About Scams</h1>
<section>
  <h2>Common Phishing Tactics</h2>
  <article>
    <h3>Email Spoofing</h3>
    <p>...</p>
  </article>
</section>
```

---

### Quiz.tsx - TODO
**Checklist**:
- [ ] Question text is clear and descriptive
- [ ] Radio buttons grouped with fieldset/legend
- [ ] Each option has associated label (htmlFor/id)
- [ ] Submit button has clear accessible name
- [ ] Results region has aria-live="polite"
- [ ] Score display clearly visible (not just color)
- [ ] Progress indicator for question number (e.g., "Question 1 of 10")
- [ ] Focus management when advancing to next question
- [ ] Keyboard accessible (can select with arrow keys)

**Example Pattern**:
```tsx
<fieldset>
  <legend>Question 1: {question.text}</legend>
  <div role="group">
    {question.options.map((option, idx) => (
      <label key={idx}>
        <input
          type="radio"
          name="quiz-answer"
          value={idx}
          checked={selectedAnswer === idx}
          onChange={(e) => setSelectedAnswer(Number(e.target.value))}
        />
        {option}
      </label>
    ))}
  </div>
</fieldset>
```

---

### Footer.tsx - TODO
**Checklist**:
- [ ] Footer landmark identified with `<footer>` tag
- [ ] Links are descriptive (avoid "click here", "read more")
- [ ] Contact info clearly formatted
- [ ] Social media links have aria-label identifying the platform
- [ ] Focus visible on all links
- [ ] Color contrast on footer text ≥ 4.5:1
- [ ] No keyboard traps
- [ ] List of links grouped with `<ul>` if applicable

**Example Social Links**:
```tsx
<a 
  href="https://twitter.com/scamguard" 
  aria-label="Follow us on Twitter"
  target="_blank"
  rel="noopener noreferrer"
>
  <TwitterIcon />
</a>
```

---

### NotFound.tsx - TODO
**Checklist**:
- [ ] Page title is descriptive (404, Page Not Found, etc.)
- [ ] Error message clearly explains the issue
- [ ] Link back to home has clear text
- [ ] No color-only indication of error status
- [ ] Focus indicators visible
- [ ] Heading hierarchy correct

---

## Testing Tools & Resources

### Automated Testing
1. **Axe DevTools** (Chrome/Firefox extension)
   - Instant accessibility scanning
   - Catches many WCAG violations

2. **Lighthouse** (Built into Chrome DevTools)
   - Run audit on any page
   - Reports accessibility score

3. **WAVE** (WebAIM tool)
   - Browser extension
   - Visual feedback on errors

### Manual Testing

**Keyboard Navigation**:
```bash
# Test without mouse
1. Click address bar
2. Press Tab to navigate entire page
3. Verify all interactive elements are reachable
4. Test Shift+Tab to go backwards
5. Test Enter/Space to activate
```

**Color Contrast**:
- Use WebAIM Contrast Checker
- Copy text color and background color hex codes
- Verify ratio ≥ 4.5:1 (normal) or 3:1 (large)

**Screen Reader** (Windows):
- NVDA: Free, open-source
- Test page navigation and announcements

**Screen Reader** (Mac):
- VoiceOver: Built-in
- Cmd + F5 to enable

### Color Contrast Values
```
Blue accent (#2563eb on white):
#2563eb = RGB(37, 99, 235)
White = RGB(255, 255, 255)
Ratio = 8.3:1 ✓ Excellent

Gray text (#666 on white):
Ratio = 7:1 ✓ Excellent

For testing: WebAIM.org/resources/contrastchecker/
```

---

## Implementation Checklist - Per Component

### [  ] Hero.tsx
- [ ] Add h1 for main heading
- [ ] Ensure all button text is descriptive
- [ ] Verify focus indicators
- [ ] Check color contrast of all text
- [ ] Test keyboard navigation

### [  ] Education.tsx
- [ ] Implement proper heading hierarchy
- [ ] Add alt text to any images
- [ ] Ensure links have descriptive text
- [ ] Check contrast on all text
- [ ] Test with screen reader

### [  ] Quiz.tsx
- [ ] Implement fieldset/legend pattern
- [ ] Link all radio button labels
- [ ] Add progress indicator
- [ ] Manage focus when advancing questions
- [ ] Test keyboard: arrow keys and Tab

### [  ] Footer.tsx
- [ ] Use <footer> landmark
- [ ] Update social links with aria-labels
- [ ] Verify all links are descriptive
- [ ] Check focus indicators
- [ ] Check contrast on footer text

### [  ] NotFound.tsx
- [ ] Descriptive page heading
- [ ] Clear error message
- [ ] Descriptive home link text
- [ ] Proper focus management
- [ ] Sufficient contrast

---

## Common Accessibility Mistakes to Avoid

❌ **WRONG**:
```tsx
<button onClick={handleClick}>→</button>
<button style={{ outline: 'none' }}>Click me</button>
<a href="/">Click here</a>
<img src="icon.png" />
<div onClick={handleClick}>Delete</div>
```

✅ **RIGHT**:
```tsx
<button onClick={handleClick} aria-label="Next">→</button>
<button className="focus:ring-2 focus:ring-blue-500">Click me</button>
<a href="/">Go to Home</a>
<img src="icon.png" alt="User profile" />
<button onClick={handleClick}>Delete</button>
```

---

## WCAG 2.1 Quick Reference

| Criterion | Level | Key Points |
|-----------|-------|-----------|
| 1.1.1 Non-text Content | A | All images need alt text |
| 1.4.3 Contrast | AA | 4.5:1 for normal text |
| 2.1.1 Keyboard | A | All functions via keyboard |
| 2.4.3 Focus Order | A | Logical focus order |
| 2.4.7 Focus Visible | AA | Visible focus indicator |
| 3.2.4 Consistent Navigation | AA | Navigation consistent |
| 3.3.2 Labels | A | Form inputs have labels |
| 4.1.2 Name, Role, Value | A | Semantic HTML + ARIA |

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project](https://www.a11yproject.com/)

---

## Sign-off Checklist

After implementing all fixes:
- [ ] Ran Axe DevTools - 0 critical issues
- [ ] Ran Lighthouse - Accessibility > 90
- [ ] Tested keyboard navigation - All elements accessible
- [ ] Tested with screen reader - Content announced correctly
- [ ] Verified color contrast - All text ≥ 4.5:1
- [ ] Checked focus indicators - Visible on all interactive elements
- [ ] Reviewed heading hierarchy - No skipped levels
- [ ] Tested on multiple browsers - Consistent experience
