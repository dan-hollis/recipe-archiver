import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { UserContext } from '../../contexts/UserContext';
import { api } from '../../utils/api';
import LoadingSpinner from '../LoadingSpinner';

export default function Recipe() {
    const { recipeId } = useParams();
    const { user } = useContext(UserContext);
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [servings, setServings] = useState(0);
    const [showNutrients, setShowNutrients] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState({});
    const localStorageKey = `recipe-${recipeId}-checked-ingredients`;
    const [originalServings, setOriginalServings] = useState(0);
    const navigate = useNavigate();
    const [canDelete, setCanDelete] = useState(false);

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const [recipeResponse, progressResponse] = await Promise.all([
                    api.get(`/recipes/${recipeId}`),
                    api.get(`/recipes/user/recipe-progress/${recipeId}`)
                ]);

                if (recipeResponse.success) {
                    setRecipe(recipeResponse.recipe);
                    setServings(recipeResponse.recipe.servings);
                    setOriginalServings(recipeResponse.recipe.servings);
                    
                    // If we have saved progress and no local storage, use the server state
                    if (progressResponse.success && !localStorage.getItem(localStorageKey)) {
                        setCheckedIngredients(progressResponse.checked_ingredients);
                        localStorage.setItem(localStorageKey, JSON.stringify(progressResponse.checked_ingredients));
                    }
                } else {
                    setError(recipeResponse.message);
                }
            } catch (err) {
                setError('Failed to fetch recipe');
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [recipeId]);

    useEffect(() => {
        const savedCheckedIngredients = localStorage.getItem(localStorageKey);
        if (savedCheckedIngredients) {
            setCheckedIngredients(JSON.parse(savedCheckedIngredients));
        }
    }, [localStorageKey]);

    useEffect(() => {
        const syncWithBackend = async () => {
            if (!user || Object.keys(checkedIngredients).length === 0) return;
            
            try {
                await api.post('/recipes/user/recipe-progress', {
                    recipe_id: recipeId,
                    checked_ingredients: checkedIngredients
                });
            } catch (err) {
                console.error('Failed to sync recipe progress:', err);
            }
        };

        return () => {
            syncWithBackend();
        };
    }, [user, recipeId, checkedIngredients]);

    useEffect(() => {
        if (user && recipe) {
            setCanDelete(
                user.is_admin || 
                recipe.users?.some(recipeUser => recipeUser.id === user.id)
            );
        }
    }, [user, recipe]);

    const calculateAdjustedValue = (originalValue, newServings) => {
        const ratio = newServings / originalServings;
        return +(originalValue * ratio).toFixed(2);
    };

    const getAdjustedIngredient = (ingredient) => {
        const match = ingredient.match(/^([\d.]+)\s*(.*)/);
        if (!match) return ingredient;
        
        const [, amount, rest] = match;
        const newAmount = calculateAdjustedValue(parseFloat(amount), servings);
        return `${newAmount} ${rest}`;
    };

    const getAdjustedCalories = () => {
        if (!recipe) return 0;
        return Math.round(calculateAdjustedValue(recipe.calories_total, servings));
    };

    const handleServingsChange = (e) => {
        const newServings = parseInt(e.target.value);
        setServings(newServings);
    };

    const handleIngredientCheck = (ingredientId, checked) => {
        const newCheckedIngredients = {
            ...checkedIngredients,
            [ingredientId]: checked
        };
        
        setCheckedIngredients(newCheckedIngredients);
        
        localStorage.setItem(localStorageKey, JSON.stringify(newCheckedIngredients));
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this recipe?')) {
            return;
        }

        try {
            const response = await api.delete_recipe(recipeId);
            if (response.success) {
                toast.success('Recipe deleted successfully');
                navigate('/recipes');
            } else {
                toast.error(response.message || 'Failed to delete recipe');
            }
        } catch (error) {
            toast.error('Error deleting recipe');
            console.error('Error:', error);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error || !recipe) {
        return (
            <div className="text-center text-red-600">
                {error || 'Recipe not found'}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    {recipe.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Source: <a href={recipe.url} target="_blank" rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800">
                        {recipe.source}
                    </a>
                </p>
                {canDelete && (
                    <button
                        onClick={handleDelete}
                        className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Delete Recipe
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <section className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Times</h2>
                        <div className="space-y-2">
                            <p><span className="font-medium">Cook time:</span> {recipe.cook_time}</p>
                            <p><span className="font-medium">Prep time:</span> {recipe.prep_time}</p>
                        </div>
                    </section>
                    <section className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Nutrition</h2>
                        <div className="space-y-2 mb-4">
                            <p><span className="font-medium">Calories total:</span> {getAdjustedCalories()}</p>
                            <p><span className="font-medium">Calories per serving:</span> {Math.round(getAdjustedCalories() / servings)}</p>
                        </div>
                        
                        <button 
                            onClick={() => setShowNutrients(!showNutrients)}
                            className="btn-primary"
                        >
                            {showNutrients ? 'Hide' : 'Show'} Nutrients
                        </button>
                        {showNutrients && (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left">Nutrient</th>
                                            <th className="px-4 py-2 text-left">Amount</th>
                                            <th className="px-4 py-2 text-left">Daily Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recipe.nutrients.map((nutrient, index) => {
                                            const adjustedAmount = calculateAdjustedValue(nutrient.amount, servings);
                                            const adjustedPercent = calculateAdjustedValue(nutrient.percent, servings);
                                            return (
                                                <tr key={index} className="border-t">
                                                    <td className="px-4 py-2">{nutrient.name}</td>
                                                    <td className="px-4 py-2">
                                                        {adjustedAmount.toFixed(2)}{nutrient.unit}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {adjustedPercent.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <section className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Tags</h2>
                        <div className="flex flex-wrap gap-2">
                            {recipe.tags && recipe.tags.length > 0 ? (
                                recipe.tags.map((tag, index) => (
                                    <span key={index} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-500">No tags available</span>
                            )}
                        </div>
                    </section>
                </div>
                <div className="space-y-6">
                    <section className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                                Servings: <span className="font-bold">{servings}</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="32"
                                value={servings}
                                onChange={handleServingsChange}
                                className="w-full"
                            />
                        </div>
                        <ul className="space-y-2">
                            {recipe.ingredients.map((ingredient, index) => (
                                <li key={index} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`ingredient-${index}`}
                                        checked={checkedIngredients[`ingredient-${index}`] || false}
                                        onChange={(e) => handleIngredientCheck(`ingredient-${index}`, e.target.checked)}
                                        className="form-checkbox"
                                    />
                                    <label htmlFor={`ingredient-${index}`}>
                                        {getAdjustedIngredient(ingredient)}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Equipment</h2>
                        {recipe.equipment && recipe.equipment.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-2">
                                {recipe.equipment.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No equipment listed</p>
                        )}
                    </section>
                </div>
                <div className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                    <ol className="list-decimal pl-5 space-y-4">
                        {recipe.instructions.map((instruction, index) => {
                            return (
                                <li key={index} className="leading-relaxed">
                                    {instruction.step_text}
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </div>
    );
}