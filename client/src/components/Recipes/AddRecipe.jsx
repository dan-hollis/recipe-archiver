import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

const AddRecipe = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('url');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateRecipeId, setDuplicateRecipeId] = useState(null);

    const [formData, setFormData] = useState({
        url: '',
        name: '',
        instructions: [{ step_text: '', step_num: 1 }],
        equipment: [''],
        ingredients: [{
            name: '',
            amount: '',
            unit: ''
        }],
        prep_time_hours: 0,
        prep_time_minutes: 0,
        cook_time_hours: 0,
        cook_time_minutes: 0,
        calories: '',
        calories_unit: 'serving',
        servings: '',
        tags: [],
        new_tags: '',
        overwrite_recipe: false,
        nutrients: [{
            name: '',
            amount: '',
            unit: ''
        }]
    });

    const baseInputClass = `w-full p-2 border rounded text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary`;

    const validateForm = () => {
        const newErrors = {};

        if (activeTab === 'url') {
            if (!formData.url) {
                newErrors.url = 'URL is required';
            } else if (!/^https?:\/\/.+/.test(formData.url)) {
                newErrors.url = 'Please enter a valid URL';
            }
        } else {
            if (!formData.name.trim()) {
                newErrors.name = 'Recipe name is required';
            }

            // Validate instructions
            if (formData.instructions.some(inst => !inst.step_text.trim())) {
                newErrors.instructions = 'All instruction steps must be filled out';
            }

            // Validate equipment
            if (formData.equipment.some(eq => !eq.trim())) {
                newErrors.equipment = 'All equipment fields must be filled out';
            }

            // Validate ingredients
            if (formData.ingredients.some(ing => !ing.name.trim() || !ing.amount || !ing.unit)) {
                newErrors.ingredients = 'All ingredient fields must be filled out';
            }

            // Validate time fields
            if (formData.prep_time_hours === 0 && formData.prep_time_minutes === 0) {
                newErrors.prep_time = 'Preparation time is required';
            }

            if (formData.cook_time_hours === 0 && formData.cook_time_minutes === 0) {
                newErrors.cook_time = 'Cooking time is required';
            }

            // Validate calories and servings
            if (!formData.calories) {
                newErrors.calories = 'Calories is required';
            }

            if (!formData.servings) {
                newErrors.servings = 'Number of servings is required';
            }

            // Validate nutrients
            if (formData.nutrients.some(nutrient => !nutrient.name.trim() || !nutrient.amount || !nutrient.unit)) {
                newErrors.nutrients = 'All nutrient fields must be filled out';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e, index = null, field = null) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            if (index !== null && field) {
                // Handle array fields (instructions, equipment, ingredients)
                const newArray = [...prev[field]];
                if (field === 'ingredients') {
                    newArray[index] = { ...newArray[index], [name]: value };
                } else if (field === 'instructions') {
                    newArray[index] = { step_text: value, step_num: index + 1 };
                } else {
                    newArray[index] = value;
                }
                return { ...prev, [field]: newArray };
            }
            return { ...prev, [name]: value };
        });
    };

    const addArrayItem = (field) => {
        setFormData(prev => {
            if (field === 'ingredients') {
                return {
                    ...prev,
                    [field]: [...prev[field], { name: '', amount: '', unit: '' }]
                };
            } else if (field === 'instructions') {
                return {
                    ...prev,
                    [field]: [...prev[field], { step_text: '', step_num: prev[field].length + 1 }]
                };
            } else {
                return {
                    ...prev,
                    [field]: [...prev[field], '']
                };
            }
        });
    };

    const removeArrayItem = (field) => {
        setFormData(prev => {
            // Don't remove if there's only one item
            if (prev[field].length <= 1) {
                return prev;
            }
            
            return {
                ...prev,
                [field]: prev[field].slice(0, -1)
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const dataToSubmit = {
                ...formData,
                overwrite_recipe: !!duplicateRecipeId
            };

            const response = await api.addRecipe(dataToSubmit);
            if (response.success) {
                navigate(`/recipes/${response.recipe_id}`);
            } else if (response.recipe_id) {
                setDuplicateRecipeId(response.recipe_id);
                setErrors({ submit: response.message });
            } else {
                setErrors({ submit: response.message || 'Failed to add recipe' });
            }
        } catch (error) {
            console.error('Error adding recipe:', error);
            setErrors({ submit: 'An error occurred while adding the recipe' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Add Recipe</h2>
            {errors.submit && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex justify-between items-center">
                    <span>{errors.submit}</span>
                    {duplicateRecipeId && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormData(prev => ({ ...prev, overwrite_recipe: true }));
                                handleSubmit({ preventDefault: () => {} });
                            }}
                            className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Overwrite Existing Recipe
                        </button>
                    )}
                </div>
            )}
            <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={() => setActiveTab('url')}
                        className={`px-4 py-2 rounded ${
                            activeTab === 'url' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Add Via URL
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-2 rounded ${
                            activeTab === 'manual' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Add Manually
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'url' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Recipe URL
                            </label>
                            <input
                                type="url"
                                name="url"
                                value={formData.url}
                                onChange={handleInputChange}
                                placeholder="https://recipe.com/recipe"
                                className={`${baseInputClass} ${
                                    errors.url ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.url && (
                                <p className="mt-1 text-sm text-red-500">{errors.url}</p>
                            )}
                        </div>
                    )}
                    {activeTab === 'manual' && (
                        <div className="space-y-6">
                            {/* Recipe Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Recipe Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={`${baseInputClass} ${
                                        errors.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>
                            {/* Equipment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Equipment
                                </label>
                                {formData.equipment.map((item, index) => (
                                    <div key={index} className="mt-1">
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => handleInputChange(e, index, 'equipment')}
                                            className={`${baseInputClass} ${
                                                errors.equipment ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                    </div>
                                ))}
                                <div className="mt-2 space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('equipment')}
                                        className="px-3 py-1 bg-green-500 text-white rounded"
                                    >
                                        Add Equipment
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('equipment')}
                                        className="px-3 py-1 bg-red-500 text-white rounded"
                                    >
                                        Remove Equipment
                                    </button>
                                </div>
                                {errors.equipment && (
                                    <p className="mt-1 text-sm text-red-500">{errors.equipment}</p>
                                )}
                            </div>
                            {/* Ingredients */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Ingredients
                                </label>
                                {formData.ingredients.map((ingredient, index) => (
                                    <div key={index} className="mt-1 grid grid-cols-6 gap-2">
                                        <input
                                            type="text"
                                            name="name"
                                            value={ingredient.name}
                                            onChange={(e) => handleInputChange(e, index, 'ingredients')}
                                            placeholder="Ingredient"
                                            className="col-span-3 p-2 border rounded"
                                        />
                                        <input
                                            type="text"
                                            name="amount"
                                            value={ingredient.amount}
                                            onChange={(e) => handleInputChange(e, index, 'ingredients')}
                                            placeholder="Amount"
                                            className="col-span-2 p-2 border rounded"
                                        />
                                        <input
                                            type="text"
                                            name="unit"
                                            value={ingredient.unit}
                                            onChange={(e) => handleInputChange(e, index, 'ingredients')}
                                            placeholder="Unit"
                                            className="col-span-1 p-2 border rounded"
                                        />
                                    </div>
                                ))}
                                <div className="mt-2 space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('ingredients')}
                                        className="px-3 py-1 bg-green-500 text-white rounded"
                                    >
                                        Add Ingredient
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('ingredients')}
                                        className="px-3 py-1 bg-red-500 text-white rounded"
                                    >
                                        Remove Ingredient
                                    </button>
                                </div>
                                {errors.ingredients && (
                                    <p className="mt-1 text-sm text-red-500">{errors.ingredients}</p>
                                )}
                            </div>
                            {/* Instructions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Instructions
                                </label>
                                {formData.instructions.map((instruction, index) => (
                                    <div key={index} className="mt-1">
                                        <textarea
                                            value={instruction.step_text}
                                            onChange={(e) => handleInputChange(e, index, 'instructions')}
                                            placeholder={`Step ${index + 1}`}
                                            className={`${baseInputClass} ${
                                                errors.instructions ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            rows="2"
                                        />
                                    </div>
                                ))}
                                <div className="mt-2 space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('instructions')}
                                        className="px-3 py-1 bg-green-500 text-white rounded"
                                    >
                                        Add Step
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('instructions')}
                                        className="px-3 py-1 bg-red-500 text-white rounded"
                                    >
                                        Remove Step
                                    </button>
                                </div>
                                {errors.instructions && (
                                    <p className="mt-1 text-sm text-red-500">{errors.instructions}</p>
                                )}
                            </div>
                            {/* Time Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Preparation Time
                                    </label>
                                    <div className="mt-1 grid grid-cols-2 gap-2">
                                        <div>
                                            <input
                                                type="number"
                                                name="prep_time_hours"
                                                value={formData.prep_time_hours}
                                                onChange={handleInputChange}
                                                min="0"
                                                className="w-full p-2 border rounded"
                                                placeholder="Hours"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                name="prep_time_minutes"
                                                value={formData.prep_time_minutes}
                                                onChange={handleInputChange}
                                                min="0"
                                                max="59"
                                                className="w-full p-2 border rounded"
                                                placeholder="Minutes"
                                            />
                                        </div>
                                    </div>
                                    {errors.prep_time && (
                                        <p className="mt-1 text-sm text-red-500">{errors.prep_time}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Cooking Time
                                    </label>
                                    <div className="mt-1 grid grid-cols-2 gap-2">
                                        <div>
                                            <input
                                                type="number"
                                                name="cook_time_hours"
                                                value={formData.cook_time_hours}
                                                onChange={handleInputChange}
                                                min="0"
                                                className="w-full p-2 border rounded"
                                                placeholder="Hours"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                name="cook_time_minutes"
                                                value={formData.cook_time_minutes}
                                                onChange={handleInputChange}
                                                min="0"
                                                max="59"
                                                className="w-full p-2 border rounded"
                                                placeholder="Minutes"
                                            />
                                        </div>
                                    </div>
                                    {errors.cook_time && (
                                        <p className="mt-1 text-sm text-red-500">{errors.cook_time}</p>
                                    )}
                                </div>
                            </div>
                            {/* Calories and Servings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Calories
                                    </label>
                                    <div className="mt-1 grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            name="calories"
                                            value={formData.calories}
                                            onChange={handleInputChange}
                                            min="0"
                                            className="w-full p-2 border rounded"
                                        />
                                        <select
                                            name="calories_unit"
                                            value={formData.calories_unit}
                                            onChange={handleInputChange}
                                            className={baseInputClass}
                                        >
                                            <option value="serving">per serving</option>
                                            <option value="total">total</option>
                                        </select>
                                    </div>
                                    {errors.calories && (
                                        <p className="mt-1 text-sm text-red-500">{errors.calories}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Servings
                                    </label>
                                    <input
                                        type="number"
                                        name="servings"
                                        value={formData.servings}
                                        onChange={handleInputChange}
                                        min="1"
                                        className="mt-1 w-full p-2 border rounded"
                                    />
                                    {errors.servings && (
                                        <p className="mt-1 text-sm text-red-500">{errors.servings}</p>
                                    )}
                                </div>
                            </div>
                            {/* Nutrients */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nutrients
                                </label>
                                {formData.nutrients.map((nutrient, index) => (
                                    <div key={index} className="mt-1 grid grid-cols-6 gap-2">
                                        <input
                                            type="text"
                                            name="name"
                                            value={nutrient.name}
                                            onChange={(e) => handleInputChange(e, index, 'nutrients')}
                                            placeholder="Nutrient (e.g., Protein, Fat)"
                                            className="col-span-3 p-2 border rounded"
                                        />
                                        <input
                                            type="text"
                                            name="amount"
                                            value={nutrient.amount}
                                            onChange={(e) => handleInputChange(e, index, 'nutrients')}
                                            placeholder="Amount"
                                            className="col-span-2 p-2 border rounded"
                                        />
                                        <input
                                            type="text"
                                            name="unit"
                                            value={nutrient.unit}
                                            onChange={(e) => handleInputChange(e, index, 'nutrients')}
                                            placeholder="Unit"
                                            className="col-span-1 p-2 border rounded"
                                        />
                                    </div>
                                ))}
                                <div className="mt-2 space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => addArrayItem('nutrients')}
                                        className="px-3 py-1 bg-green-500 text-white rounded"
                                    >
                                        Add Nutrient
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('nutrients')}
                                        className="px-3 py-1 bg-red-500 text-white rounded"
                                    >
                                        Remove Nutrient
                                    </button>
                                </div>
                            </div>
                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tags
                                </label>
                                <input
                                    type="text"
                                    name="new_tags"
                                    value={formData.new_tags}
                                    onChange={handleInputChange}
                                    placeholder="Enter tags separated by commas"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                        </div>
                    )}
                    <div className="mt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-2 px-4 rounded ${
                                isSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            } text-white`}
                        >
                            {isSubmitting ? 'Adding Recipe...' : 'Add Recipe'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddRecipe;