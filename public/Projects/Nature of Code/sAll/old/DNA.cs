using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;



// Genetic Algorithm, Evolving Shakespeare

// A class to describe a psuedo-DNA, i.e. genotype
//   Here, a virtual organism's DNA is an array of character.
//   Functionality:
//      -- convert DNA into a string
//      -- calculate DNA's "fitness"
//      -- mate DNA with another set of DNA
//      -- mutate DNA



public class DNA  {

    char[] genes;
    int fitness;
    

    string target;

    int qtyGenetype;

   public DNA(string targetString) //Create DNA randomly upon target length to define number of genes.
    {
        qtyGenetype = targetString.Length;
        genes = new char[qtyGenetype];
        for (int i = 0; i < genes.Length; i++)
        {
            genes[i] = newChar();
        }
        target = targetString;

        Fitness();
    }

    void changeTarget(string newTarget) {

        target = newTarget;
    }


    public int Fitness()
    {
        int score = 0;
        for (int i = 0; i < genes.Length; i++)
        {
            if (String.Compare(genes[i].ToString(), target[i].ToString()) ==0)
            {
                score++;
                //Debug.Log("Score!");
            }
        }
       
        fitness = (int)Mathf.Pow(2,score) ; //  create an exponential increase of fitness 
        //if(fitness > 1) Debug.Log("Fitness for " + new string(genes) + " has fitness: " + fitness);
        return fitness;
    }

    // Heredity
    public DNA crossover(DNA partner)
    {
        // The child is a new instance of DNA. Note that the DNA is generated randomly in the constructor, but we will overwrite it below with DNA from parents.
        DNA child = new DNA(target);
        // Picking a random “midpoint” in the genes array
        int midpoint = UnityEngine.Random.Range(0, genes.Length);
        for (int i = 0; i < genes.Length; i++)
        {
            // Before midpoint copy genes from one parent, after midpoint copy genes from the other parent
            if (i > midpoint) child.genes[i] = this.genes[i];
            else              child.genes[i] = partner.genes[i];
        }
        return child; //  Return the new child DNA
    }

    // Based on a mutation probability, picks a new random character
    public void mutate(float mutationRate)
    {
        for (int i = 0; i < genes.Length; i++) 
        {
            if (UnityEngine.Random.Range(0,1.0f) < mutationRate)
            {
                genes[i] = newChar();  //  Mutation - generate a new random character
            }
        }
    }

    // Convert to String—PHENOTYPE.
    public string getPhrase()
    {
        string s = new string(genes);
        return s;

    }

    public char newChar()
    {
        // Picking randomly from a range of characters with ASCII values between 32 and 128.For more about ASCII: http://en.wikipedia.org/wiki/ASCII
        char c = (char)UnityEngine.Random.Range(63, 122);
        if (c == 63) c = (char)32;
        if (c == 64) c = (char)46;

        return c;
    }

    public int getFitness()
    {
        return fitness;
    }
}

