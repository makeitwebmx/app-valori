import os
import re

files_to_patch = [
    'legacy_v1.1.1.js',
    'legacy_V1.0.js',
    'legacy_V0.9.js',
    'legacy_V0.8.js'
]

broken_pattern = r"""\s*const fullName = resolveUserFullName\(null, session\.user\);\s*let initialPlanType = session\.user\.user_metadata\?\.plan_type \|\| session\.user\.user_metadata\?\.package_type \|\| session\.user\.user_metadata\?\.plan;\s*if \(isCoachRole\(fallbackRole\) && !initialPlanType\) \{\s*initialPlanType = 'Plan Basic'; // Default to Basic to prevent UI flashing of premium modules\s*\}\s*state\.user = \{\s*id: session\.user\.id,\s*email: session\.user\.email,\s*full_name: fullName,\s*role: session\.user\.user_metadata\?\.role \|\| 'client',\s*plan_type: initialPlanType,\s*created_at: session\.user\.created_at\s*\};"""

correct_code = """    const fullName = resolveUserFullName(null, session.user);
    state.user = {
        id: session.user.id,
        email: session.user.email,
        full_name: fullName,
        role: session.user.user_metadata?.role || 'client',
        plan_type: session.user.user_metadata?.plan_type,
        created_at: session.user.created_at
    };"""

for filename in files_to_patch:
    print(f"Fixing {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace only the first occurrence (which is inside hydrateUserFromSession)
    # The one in applySessionRedirect has different text for role: fallbackRole
    
    new_content, count = re.subn(broken_pattern, "\n" + correct_code, content, count=1)
    
    if count > 0:
        with open(filename, 'w', encoding='utf-8', newline='') as f:
            f.write(new_content)
        print(f"  Successfully fixed {filename}")
    else:
        print(f"  Pattern not found in {filename}")
