import os
import re

files_to_patch = [
    'legacy_v1.1.1.js',
    'legacy_V1.0.js',
    'legacy_V0.9.js',
    'legacy_V0.8.js'
]

patch_code = """    const fullName = resolveUserFullName(null, session.user);
    
    let initialPlanType = session.user.user_metadata?.plan_type || session.user.user_metadata?.package_type || session.user.user_metadata?.plan;
    if (isCoachRole(fallbackRole) && !initialPlanType) {
        initialPlanType = 'Plan Basic'; // Default to Basic to prevent UI flashing of premium modules
    }"""

for filename in files_to_patch:
    print(f"Patching {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find applySessionRedirect definition Start
    start_idx = content.find('const applySessionRedirect = async')
    if start_idx == -1:
        print("Not found applySessionRedirect")
        continue
        
    # Find resolveUserFullName AFTER start_idx
    target_str = "const fullName = resolveUserFullName(null, session.user);"
    resolve_idx = content.find(target_str, start_idx)
    
    if resolve_idx == -1:
        print("Not found resolveUserFullName inside applySessionRedirect")
        continue
        
    content = content[:resolve_idx] + patch_code + content[resolve_idx + len(target_str):]
    
    # Now fix the state.user block after this replace point
    # Find next state.user = { after resolve_idx
    state_idx = content.find("state.user = {", resolve_idx)
    if state_idx == -1:
        continue
        
    created_at_idx = content.find("created_at: session.user.created_at", state_idx)
    
    if created_at_idx != -1:
        # Check if plan_type is already between state_idx and created_at_idx
        state_block = content[state_idx:created_at_idx]
        if "plan_type:" not in state_block:
            # Inject plan_type initialized with initialPlanType
            content = content[:created_at_idx] + "plan_type: initialPlanType,\n        " + content[created_at_idx:]
        else:
            # Replace whatever plan_type line is there with plan_type: initialPlanType,
            content = content[:state_idx] + re.sub(r"plan_type:[^,]*,", "plan_type: initialPlanType,", content[state_idx:created_at_idx]) + content[created_at_idx:]

    with open(filename, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f"  Successfully patched {filename}")
