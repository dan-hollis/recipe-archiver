import operator

import bleach


def get_instructions_equipment(recipe_instructions_list):
    recipe_instructions = []
    recipe_equipment = []
    for recipe_instruction_item in recipe_instructions_list:
        for recipe_instruction_step in recipe_instruction_item['steps']:
            recipe_instruction_text = recipe_instruction_step['step']
            recipe_instruction_step_num = recipe_instruction_step['number']
            recipe_instructions.append({'step_text': bleach.clean(str(recipe_instruction_text)), 'step_num': bleach.clean(str(recipe_instruction_step_num))})
            for recipe_equipment_item in recipe_instruction_step['equipment']:
                if recipe_equipment_item['name'] not in recipe_equipment:
                    recipe_equipment.append(bleach.clean(str(recipe_equipment_item['name'])))
    # Make sure instructions are sorted properly
    recipe_instructions = sorted(recipe_instructions, key=operator.itemgetter('step_num'))
    return recipe_instructions, recipe_equipment
