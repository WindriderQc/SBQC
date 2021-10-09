// Genetic Algorithm, Evolving Shakespeare

// Demonstration of using a genetic algorithm to perform a search

// setup()
//  # Step 1: The Population 
//    # Create an empty population (an array or ArrayList)
//    # Fill it with DNA encoded objects (pick random values to start)

// draw()
//  # Step 1: Selection 
//    # Create an empty mating pool (an empty ArrayList)
//    # For every member of the population, evaluate its fitness based on some criteria / function, 
//      and add it to the mating pool in a manner consistant with its fitness, i.e. the more fit it 
//      is the more times it appears in the mating pool, in order to be more likely picked for reproduction.

//  # Step 2: Reproduction Create a new empty population
//    # Fill the new population by executing the following steps:
//       1. Pick two "parent" objects from the mating pool.
//       2. Crossover -- create a "child" object by mating these two parents.
//       3. Mutation -- mutate the child's DNA based on a given probability.
//       4. Add the child object to the new population.
//    # Replace the old population with the new population
//  
//   # Rinse and repeat


public class Population
{

    DNA[] population;
    float mutateRate;  
    string target;
    
    int maxFitness = 0;
    int sumFitness = 0;
  

  //  public bool isFinished = false;   //are we finished evolving?
    public int generations = 0;
 
    public string BestPhrase = "";

    /* struct NewBorn
     {
         public DNA newDNA;
         public int popIndex;
         public NewBorn(DNA dna, int index)
         {
             newDNA = dna;
             popIndex = index;
         }
     }*/

    public Population(string targetString, float mutationRate, int maxPop)
    {
        mutateRate = mutationRate;
       // target = targetString;
        population = new DNA[maxPop];
        for (int i = 0; i < population.Length; i++)  //  creates first generation
        {
            population[i] = new DNA(targetString);
        }
        calculateFitness();
       
    }

    // Calculate fitnesses,  //  Gets the population maximum Fitness and Compute the current "most fit" member of the population
    public void calculateFitness()
    {
        maxFitness = 0; 
        sumFitness = 0;

        foreach (DNA dna in population)
        {

            int fit = dna.Fitness();
            sumFitness = sumFitness + fit;
            if (fit > maxFitness)  {
                BestPhrase = "" + dna.getPhrase() + "  f:" + fit;
                maxFitness = fit; 
            }
        }
    }

    // Natural Selection & Reproduction
    public void Reproduce()
    {
        // Refill the population with children 
        DNA[] newGeneration = new DNA[population.Length];
        for (int i = 0; i < population.Length; i++)  //  One iteration for every DNA in Population
        {
            DNA partnerA = getRandom();
            DNA partnerB = getRandom();

            //Step 3a: Crossover
            DNA child = partnerA.crossover(partnerB);
            // Step 3b: Mutation
            child.mutate(mutateRate);
            newGeneration[i] = child;
           
        }
        population = newGeneration;
        generations++;
    }

    // random weighted pool selection 
    DNA getRandom()
    {
        int diceRoll = Random.Range(0, sumFitness); 
        int index = 0;
           
        while (diceRoll > 0)
        {
            diceRoll = diceRoll - population[index].getFitness();
            index++;
        }
        return population[Mathf.Max(0, index - 1)];
    }


    //  Getters n Setters
    public string getBest()
    {
        return BestPhrase;
    }
    public int getMaxFitness()
    {
        return maxFitness;
    }
    public int getSumFitness()
    {
        return sumFitness;
    }
    public float getAverageFitness()
    {
        float avg = sumFitness / (population.Length);
        return avg; 
    }

}
